-- Keep products.rating (avg) and products.review_count in sync with approved
-- product_reviews, so the PRODUCT CARD (which reads products.rating) shows the
-- real customer rating — not just the product detail page.

create or replace function recalc_product_rating(pid uuid) returns void as $$
begin
  update products p set
    rating = (
      select round(avg(r.rating)::numeric, 1)
      from product_reviews r
      where r.product_id = pid and r.status = 'approved'
    ),
    review_count = (
      select count(*)
      from product_reviews r
      where r.product_id = pid and r.status = 'approved'
    )
  where p.id = pid;
end;
$$ language plpgsql;

create or replace function trg_product_reviews_aggregate() returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform recalc_product_rating(old.product_id);
    return old;
  else
    perform recalc_product_rating(new.product_id);
    if (tg_op = 'UPDATE' and new.product_id is distinct from old.product_id) then
      perform recalc_product_rating(old.product_id);
    end if;
    return new;
  end if;
end;
$$ language plpgsql;

drop trigger if exists product_reviews_aggregate on product_reviews;
create trigger product_reviews_aggregate
after insert or update or delete on product_reviews
for each row execute function trg_product_reviews_aggregate();

-- One-time backfill for reviews that already exist.
update products p set
  rating = sub.avg_rating,
  review_count = sub.cnt
from (
  select pr.product_id,
         round(avg(pr.rating)::numeric, 1) as avg_rating,
         count(*) as cnt
  from product_reviews pr
  where pr.status = 'approved'
  group by pr.product_id
) sub
where p.id = sub.product_id;
