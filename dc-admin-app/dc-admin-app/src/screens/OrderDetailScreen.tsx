import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, taka } from "../api";
import { C, STATUS, STATUS_ORDER } from "../theme";

function telLink(phone: string) {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return "tel:+" + n;
}

export default function OrderDetailScreen({ route }: any) {
  const { id } = route.params;
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.order(id); setO(res.order); }
    catch (e: any) { Alert.alert("ত্রুটি", e?.message || "লোড ব্যর্থ।"); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function changeStatus(st: string) {
    setBusy(true);
    try { await api.setStatus(id, st); await load(); }
    catch (e: any) { Alert.alert("ত্রুটি", e?.message); }
    finally { setBusy(false); }
  }
  async function call() {
    try { await api.logCall(id); } catch {}
    Linking.openURL(telLink(o.phone));
    load();
  }
  async function resetCall() {
    setBusy(true);
    try { await api.resetCall(id); await load(); } catch {} finally { setBusy(false); }
  }

  if (loading || !o) return <View style={s.center}><ActivityIndicator size="large" color={C.brand} /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={s.head}>
        <Text style={s.orderNo}>{o.orderNumber}</Text>
        <Text style={s.total}>{taka(o.total)}</Text>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={[s.act, { backgroundColor: o.callAttempts >= 3 ? C.red : C.brand }]} onPress={call}>
          <Text style={s.actText}>📞 কল{o.callAttempts > 0 ? ` (${o.callAttempts}/3)` : ""}</Text>
        </TouchableOpacity>
        {o.callAttempts > 0 && (
          <TouchableOpacity style={[s.act, s.actGhost]} onPress={resetCall}><Text style={[s.actText, { color: C.sub }]}>↺ রিসেট</Text></TouchableOpacity>
        )}
        <TouchableOpacity style={[s.act, { backgroundColor: C.green }]} onPress={() => Linking.openURL("https://wa.me/" + telLink(o.phone).replace("tel:+", ""))}>
          <Text style={s.actText}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {/* Customer */}
      <Card title="গ্রাহক">
        <Row k="নাম" v={o.name} />
        <Row k="ফোন" v={o.phone} />
        <Row k="ঠিকানা" v={o.address} />
        {!!o.notes && <Row k="নোট" v={o.notes} />}
      </Card>

      {/* Items */}
      <Card title="পণ্য">
        {o.items.map((it: any, i: number) => (
          <View key={i} style={s.item}>
            <Text style={{ flex: 1, color: C.text }}>{it.name} × {it.qty}</Text>
            <Text style={{ color: C.text, fontWeight: "600" }}>{taka(it.lineTotal)}</Text>
          </View>
        ))}
        <View style={[s.item, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
          <Text style={{ flex: 1, fontWeight: "800", color: C.text }}>সর্বমোট</Text>
          <Text style={{ fontWeight: "800", color: C.text }}>{taka(o.total)}</Text>
        </View>
      </Card>

      {/* Status */}
      <Card title="স্ট্যাটাস পরিবর্তন">
        <View style={s.statusWrap}>
          {STATUS_ORDER.map((st) => {
            const on = o.status === st;
            const meta = STATUS[st];
            return (
              <TouchableOpacity key={st} disabled={busy} onPress={() => changeStatus(st)} style={[s.statusChip, on && { backgroundColor: meta.color, borderColor: meta.color }]}>
                <Text style={[s.statusChipText, on && { color: "#fff", fontWeight: "700" }]}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {busy && <ActivityIndicator color={C.brand} style={{ marginTop: 8 }} />}
      </Card>
    </ScrollView>
  );
}

function Card({ title, children }: any) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      <Text style={s.rowV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderNo: { fontSize: 20, fontWeight: "800", color: C.brand },
  total: { fontSize: 20, fontWeight: "800", color: C.text },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  act: { flexGrow: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", minWidth: 90 },
  actGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  actText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 12, fontWeight: "700", color: C.sub, textTransform: "uppercase", marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 8 },
  rowK: { width: 70, color: C.sub, fontSize: 14 },
  rowV: { flex: 1, color: C.text, fontSize: 14 },
  item: { flexDirection: "row", paddingVertical: 5 },
  statusWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  statusChipText: { color: C.sub, fontSize: 13 },
});
