import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, taka } from "../api";
import { C, STATUS } from "../theme";

const TABS = [
  { v: "", l: "সব" },
  { v: "pending", l: "পেন্ডিং" },
  { v: "call_attempt", l: "কল অ্যাটেম্পট" },
  { v: "confirmed", l: "কনফার্মড" },
  { v: "shipped", l: "শিপড" },
  { v: "delivered", l: "ডেলিভার্ড" },
  { v: "cancelled", l: "বাতিল" },
];

export default function OrdersScreen({ navigation, route }: any) {
  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (st: string, query: string) => {
    try {
      setErr(null);
      const res = await api.orders(st, query, 1);
      setOrders(res.orders || []);
    } catch (e: any) {
      setErr(e?.message || "লোড ব্যর্থ।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(status, q); }, [status]));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.search}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(status, q)}
          placeholder="অর্ডার নম্বর / নাম / ফোন"
          style={s.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View style={{ maxHeight: 46 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.v} onPress={() => setStatus(t.v)} style={[s.tab, status === t.v && s.tabOn]}>
              <Text style={[s.tabText, status === t.v && s.tabTextOn]}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.brand} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(status, q); }} />}
          ListEmptyComponent={<Text style={s.empty}>{err || "কোনো অর্ডার নেই।"}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate("OrderDetail", { id: item.id })} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <View style={s.rowTop}>
                  <Text style={s.orderNo}>{item.orderNumber}</Text>
                  <Badge status={item.status} />
                </View>
                <Text style={s.name}>{item.name} · {item.phone}</Text>
                <Text style={s.addr} numberOfLines={1}>{item.address}</Text>
                <Text style={s.items} numberOfLines={1}>{item.items.map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</Text>
              </View>
              <Text style={s.total}>{taka(item.total)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function Badge({ status }: { status: string }) {
  const st = STATUS[status] || { label: status, color: C.sub };
  return (
    <View style={[s.badge, { backgroundColor: st.color + "22" }]}>
      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  search: { padding: 12, paddingBottom: 6 },
  searchInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  tabs: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: "#fff" },
  tabOn: { backgroundColor: C.brand, borderColor: C.brand },
  tabText: { color: C.sub, fontSize: 13 },
  tabTextOn: { color: "#fff", fontWeight: "700" },
  row: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  orderNo: { fontWeight: "800", color: C.brand },
  name: { fontSize: 14, color: C.text, marginTop: 2 },
  addr: { fontSize: 13, color: C.sub, marginTop: 1 },
  items: { fontSize: 12, color: C.sub, marginTop: 3 },
  total: { fontWeight: "800", color: C.text, marginLeft: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: C.sub, marginTop: 40 },
});
