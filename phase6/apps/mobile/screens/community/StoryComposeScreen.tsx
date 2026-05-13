// ============================================================
// Coach DM · Phase 6 · StoryComposeScreen
// Création d'une story (photo / before_after / milestone)
// ============================================================

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { COACH_DM_COLORS, tCommunity, type Lang, type StoryKind } from "@coachdm/shared/community";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLang } from "../../lib/useLang";

export function StoryComposeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const lang: Lang = useLang();
  const [kind, setKind] = useState<StoryKind>("photo");
  const [image, setImage] = useState<string | null>(null);
  const [imageBefore, setImageBefore] = useState<string | null>(null);
  const [captionFr, setCaptionFr] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [captionNl, setCaptionNl] = useState("");
  const [statLabel, setStatLabel] = useState("");
  const [statValue, setStatValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const t = useCallback((k: any) => tCommunity(lang, k), [lang]);

  const pickImage = async (which: "main" | "before") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      aspect: [9, 16],
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      if (which === "main") setImage(res.assets[0].uri);
      else setImageBefore(res.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string, suffix: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${suffix}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from("community-stories")
        .upload(path, arrayBuffer, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("community-stories").createSignedUrl
        ? await supabase.storage.from("community-stories").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: null as any };
      return data?.signedUrl ?? path;
    } catch (e) {
      console.error("upload error", e);
      return null;
    }
  };

  const submit = async () => {
    if (!user || !image) return;
    setSubmitting(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("coach_id, role, id")
        .eq("id", user.id)
        .single();
      const coachId = prof?.role === "coach" ? prof.id : prof?.coach_id;
      if (!coachId) {
        Alert.alert(
          lang === "fr" ? "Erreur" : lang === "nl" ? "Fout" : "Error",
          lang === "fr"
            ? "Aucun coach associé."
            : lang === "nl"
              ? "Geen coach gekoppeld."
              : "No coach linked.",
        );
        setSubmitting(false);
        return;
      }
      const url = await uploadImage(image, "after");
      const urlBefore =
        kind === "before_after" && imageBefore ? await uploadImage(imageBefore, "before") : null;
      if (!url) throw new Error("upload failed");

      const { error } = await supabase.from("community_stories").insert({
        coach_id: coachId,
        author_id: user.id,
        kind,
        image_url: url,
        image_before_url: urlBefore,
        caption_fr: captionFr || null,
        caption_en: captionEn || null,
        caption_nl: captionNl || null,
        stat_label: statLabel || null,
        stat_value: statValue || null,
      });
      if (error) throw error;
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert(
        lang === "fr" ? "Erreur" : lang === "nl" ? "Fout" : "Error",
        String((e as Error).message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={styles.title}>{t("stories_create")}</Text>

      {/* Kind selector */}
      <View style={styles.row}>
        {(["photo", "before_after", "milestone"] as StoryKind[]).map((k) => (
          <Pressable
            key={k}
            style={[styles.chip, kind === k && styles.chipActive]}
            onPress={() => setKind(k)}
          >
            <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>
              {t(`stories_kind_${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Image pickers */}
      {kind === "before_after" ? (
        <View style={styles.rowImg}>
          <Pressable style={styles.imgPicker} onPress={() => pickImage("before")}>
            {imageBefore ? (
              <Image source={{ uri: imageBefore }} style={styles.imgPreview} />
            ) : (
              <Text style={styles.imgPickerText}>{t("stories_before")}</Text>
            )}
          </Pressable>
          <Pressable style={styles.imgPicker} onPress={() => pickImage("main")}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imgPreview} />
            ) : (
              <Text style={styles.imgPickerText}>{t("stories_after")}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable style={[styles.imgPicker, { height: 220 }]} onPress={() => pickImage("main")}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imgPreview} />
          ) : (
            <Text style={styles.imgPickerText}>+ Photo</Text>
          )}
        </Pressable>
      )}

      {/* Stat */}
      {(kind === "milestone" || kind === "before_after") && (
        <View style={styles.statBlock}>
          <Text style={styles.sectionLabel}>{t("stories_stat_label")}</Text>
          <TextInput
            value={statLabel}
            onChangeText={setStatLabel}
            placeholder={lang === "fr" ? "Poids · Squat · -8 kg" : lang === "nl" ? "Gewicht · Squat" : "Weight · Squat"}
            placeholderTextColor={COACH_DM_COLORS.textMuted}
            style={styles.input}
          />
          <Text style={styles.sectionLabel}>{t("stories_stat_value")}</Text>
          <TextInput
            value={statValue}
            onChangeText={setStatValue}
            placeholder="-8 kg"
            placeholderTextColor={COACH_DM_COLORS.textMuted}
            style={styles.input}
          />
        </View>
      )}

      {/* Captions trilingue */}
      <Text style={styles.sectionLabel}>{t("stories_caption")} (FR)</Text>
      <TextInput
        value={captionFr}
        onChangeText={setCaptionFr}
        placeholder="Texte en français"
        placeholderTextColor={COACH_DM_COLORS.textMuted}
        style={[styles.input, { minHeight: 60 }]}
        multiline
      />
      <Text style={styles.sectionLabel}>{t("stories_caption")} (EN)</Text>
      <TextInput
        value={captionEn}
        onChangeText={setCaptionEn}
        placeholder="Text in English"
        placeholderTextColor={COACH_DM_COLORS.textMuted}
        style={[styles.input, { minHeight: 60 }]}
        multiline
      />
      <Text style={styles.sectionLabel}>{t("stories_caption")} (NL)</Text>
      <TextInput
        value={captionNl}
        onChangeText={setCaptionNl}
        placeholder="Tekst in het Nederlands"
        placeholderTextColor={COACH_DM_COLORS.textMuted}
        style={[styles.input, { minHeight: 60 }]}
        multiline
      />

      <Pressable
        style={[styles.submit, (!image || submitting) && { opacity: 0.4 }]}
        disabled={!image || submitting}
        onPress={submit}
      >
        {submitting ? (
          <ActivityIndicator color={COACH_DM_COLORS.bg} />
        ) : (
          <Text style={styles.submitText}>{t("stories_publish")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  title: { color: COACH_DM_COLORS.gold, fontSize: 22, fontWeight: "800", marginBottom: 16, marginTop: 32 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
  },
  chipActive: { backgroundColor: COACH_DM_COLORS.gold, borderColor: COACH_DM_COLORS.gold },
  chipText: { color: COACH_DM_COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: COACH_DM_COLORS.bg },

  rowImg: { flexDirection: "row", gap: 8, marginBottom: 16 },
  imgPicker: {
    flex: 1,
    height: 240,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COACH_DM_COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imgPickerText: { color: COACH_DM_COLORS.textMuted, fontSize: 14 },
  imgPreview: { width: "100%", height: "100%" },

  statBlock: { marginTop: 8, marginBottom: 8 },
  sectionLabel: { color: COACH_DM_COLORS.gold, fontWeight: "700", fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#1a1a1a",
    color: COACH_DM_COLORS.text,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },

  submit: {
    marginTop: 20,
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: COACH_DM_COLORS.bg, fontWeight: "800", fontSize: 15 },
});

export default StoryComposeScreen;
