import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, taka, clearAuth } from "../api";
import { C } from "../theme";

export default function DashboardScreen({ navigation, onLogout }: any) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const res = await api.dashboard();
      setStats(res.stats);
    } catch (e: any) {
      setErr(e?.message || "লোড ব্যর্থ।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={C.brand} /></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={s.h1}>ড্যাশবোর্ড</Text>
      {err && <Text style={s.err}>{err}</Text>}

      <View style={s.grid}>
        <Stat label="আজকের অর্ডার" value={String(stats?.todayOrders ?? 0)} tone={C.brand} />
        <Stat label="আজকের আয়" value={taka(stats?.todayRevenue ?? 0)} tone={C.green} />
        <Stat label="পেন্ডিং" value={String(stats?.pending ?? 0)} tone={C.amber} onPress={() => navigation.navigate("Orders", { status: "pending" })} />
        <Stat label="মোট অর্ডার" value={String(stats?.totalOrders ?? 0)} tone={C.blue} />
      </View>

      <TouchableOpacity style={s.link} onPress={() => navigation.navigate("Orders", { status: "pending" })}>
        <Text style={s.linkText}>পেন্ডিং অর্ডার দেখুন →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.logout} onPress={async () => { await clearAuth(); onLogout(); }}>
        <Text style={s.logoutText}>লগআউট</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value, tone, onPress }: any) {
  const Comp: any = onPress ? TouchableOpacity : View;
  return (
    <Comp style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.dot, { backgroundColor: tone }]} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Comp>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  h1: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 14 },
  err: { color: C.red, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 13, color: C.sub, marginTop: 2 },
  link: { marginTop: 18, backgroundColor: C.brand, borderRadius: 14, padding: 15, alignItems: "center" },
  linkText: { color: "#fff", fontWeight: "700" },
  logout: { marginTop: 24, alignItems: "center", padding: 12 },
  logoutText: { color: C.red, fontWeight: "600" },
});
