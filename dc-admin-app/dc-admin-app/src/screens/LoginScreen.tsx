import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { ping, saveAuth } from "../api";
import { C } from "../theme";

export default function LoginScreen({ onDone }: { onDone: () => void }) {
  const [base, setBase] = useState("https://dreamcomfortbd.com");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login() {
    setErr(null);
    if (!base.trim() || !token.trim()) { setErr("URL ও টোকেন দিন।"); return; }
    setBusy(true);
    try {
      await ping(base, token);
      await saveAuth(base, token);
      onDone();
    } catch (e: any) {
      setErr(e?.message || "লগইন ব্যর্থ।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.brand }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>DreamComfort</Text>
        <Text style={s.sub}>অ্যাডমিন অ্যাপ</Text>

        <View style={s.card}>
          <Text style={s.label}>API URL</Text>
          <TextInput value={base} onChangeText={setBase} autoCapitalize="none" keyboardType="url" placeholder="https://dreamcomfortbd.com" style={s.input} />

          <Text style={s.label}>Access Token</Text>
          <TextInput value={token} onChangeText={setToken} autoCapitalize="none" secureTextEntry placeholder="অ্যাডমিন সেটিংস থেকে টোকেন" style={s.input} />

          {err && <Text style={s.err}>{err}</Text>}

          <TouchableOpacity style={s.btn} onPress={login} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>লগইন</Text>}
          </TouchableOpacity>
          <Text style={s.hint}>টোকেন পাবেন: Admin → সেটিংস → অ্যান্ড্রয়েড অ্যাপ (API টোকেন)।</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { color: "#fff", fontSize: 30, fontWeight: "800", textAlign: "center" },
  sub: { color: "#e6fffb", fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  label: { fontSize: 13, color: C.sub, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  err: { color: C.red, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { color: C.sub, fontSize: 12, marginTop: 14, textAlign: "center" },
});
