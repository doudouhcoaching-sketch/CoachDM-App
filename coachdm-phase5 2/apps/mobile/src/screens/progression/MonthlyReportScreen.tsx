// =====================================================================
// Coach DM · Phase 5 · MonthlyReportScreen
// Génération PDF on-device (react-native-html-to-pdf) + partage natif
// =====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import {
  COACH_DM_COLORS,
  t,
  formatPRValue,
  formatDate,
  formatMonth,
  type Locale,
  type BodyMetric,
  type PersonalRecord,
  type DailyActivity,
} from '@coachdm/shared/progression';
import { supabase } from '../../lib/supabase';

interface Props {
  locale?: Locale;
}

interface MonthData {
  startDate: string;
  endDate: string;
  metricsStart: BodyMetric | null;
  metricsEnd: BodyMetric | null;
  prs: PersonalRecord[];
  activities: DailyActivity[];
  totalWorkouts: number;
  totalCardio: number;
  activeDays: number;
}

function formatBrand(locale: Locale) {
  return locale === 'fr'
    ? 'Bilan complet · Coach DM'
    : locale === 'en'
    ? 'Complete summary · Coach DM'
    : 'Volledig overzicht · Coach DM';
}

function buildHTML(data: MonthData, locale: Locale): string {
  const monthLabel = formatMonth(data.startDate + 'T12:00:00Z', locale);

  const startW = data.metricsStart?.weight_kg ?? null;
  const endW = data.metricsEnd?.weight_kg ?? null;
  const deltaW = startW !== null && endW !== null ? Math.round((endW - startW) * 100) / 100 : null;

  const startBF = data.metricsStart?.body_fat_pct ?? null;
  const endBF = data.metricsEnd?.body_fat_pct ?? null;
  const deltaBF =
    startBF !== null && endBF !== null ? Math.round((endBF - startBF) * 100) / 100 : null;

  const startWaist = data.metricsStart?.waist_cm ?? null;
  const endWaist = data.metricsEnd?.waist_cm ?? null;
  const deltaWaist =
    startWaist !== null && endWaist !== null
      ? Math.round((endWaist - startWaist) * 10) / 10
      : null;

  const prsHtml = data.prs.length === 0
    ? `<p style="color:#A1A1AA;font-style:italic;">${
        locale === 'fr' ? 'Aucun record ce mois.' :
        locale === 'en' ? 'No PR this month.' :
        'Geen records deze maand.'
      }</p>`
    : data.prs
        .map(
          (pr) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #27272A;color:#FFF;">
            ${pr.exercise_name ?? pr.activity_type ?? pr.category}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #27272A;color:#A1A1AA;font-size:11px;">
            ${formatDate(pr.achieved_at, locale)}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #27272A;color:#D4AF37;text-align:right;font-weight:700;">
            ${formatPRValue(pr.category, pr.value, pr.unit)}
          </td>
        </tr>`
        )
        .join('');

  const deltaColor = (n: number | null, inverse = false) => {
    if (n === null) return '#A1A1AA';
    const positiveGood = inverse ? n < 0 : n > 0;
    return n === 0 ? '#A1A1AA' : positiveGood ? '#10B981' : '#EF4444';
  };

  const fmtDelta = (n: number | null, unit: string) =>
    n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)} ${unit}`;

  const labels = {
    title: { fr: 'Rapport mensuel', en: 'Monthly Report', nl: 'Maandrapport' }[locale],
    weight: t('weight', locale),
    bf: t('body_fat', locale),
    waist: t('waist', locale),
    start: { fr: 'Début', en: 'Start', nl: 'Begin' }[locale],
    end: { fr: 'Fin', en: 'End', nl: 'Einde' }[locale],
    delta: { fr: 'Évolution', en: 'Change', nl: 'Verandering' }[locale],
    prs: t('personal_records', locale),
    activity: t('activity_calendar', locale),
    workouts: { fr: 'Séances', en: 'Workouts', nl: 'Trainingen' }[locale],
    cardio: 'Cardio',
    active_days: t('total_active_days', locale),
    exercise: { fr: 'Exercice', en: 'Exercise', nl: 'Oefening' }[locale],
    date: 'Date',
    value: { fr: 'Valeur', en: 'Value', nl: 'Waarde' }[locale],
    footer: 'coachdm.be · BCE BE0840.260.421',
  };

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 1.6cm 1.6cm 1.7cm 1.6cm; }
  body { background:#0A0A0A; color:#FFF; font-family:Helvetica, Arial, sans-serif; margin:0; padding:0; }
  .wrap { padding: 0; }
  .header { border-bottom: 2px solid #D4AF37; padding-bottom: 14px; margin-bottom: 20px; }
  h1 { color:#D4AF37; font-size:26px; margin:0; font-weight:800; }
  .sub { color:#A1A1AA; font-size:12px; margin-top:4px; }
  .month { color:#FFF; font-size:18px; margin-top:8px; font-weight:600; }
  h2 { color:#D4AF37; font-size:15px; margin: 22px 0 8px; border-left:3px solid #D4AF37; padding-left:8px; }
  .kpi-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 8px; }
  .kpi-row { display: table-row; }
  .kpi { display:table-cell; background:#171717; border-radius:8px; padding:10px; width:33%; }
  .kpi-label { color:#A1A1AA; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
  .kpi-value { color:#FFF; font-size:18px; font-weight:700; margin-top:4px; }
  .kpi-delta { font-size:12px; font-weight:600; margin-top:4px; }
  table { width:100%; border-collapse:collapse; background:#171717; border-radius:8px; overflow:hidden; }
  th { color:#D4AF37; text-align:left; padding:8px; font-size:11px; text-transform:uppercase; border-bottom:1px solid #D4AF37; }
  td { font-size:12px; }
  .footer { margin-top:32px; padding-top:10px; border-top:1px solid #27272A; color:#A1A1AA; font-size:10px; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>${labels.title}</h1>
    <div class="sub">${formatBrand(locale)}</div>
    <div class="month">${monthLabel}</div>
  </div>

  <h2>${
    locale === 'fr' ? 'Composition corporelle'
    : locale === 'en' ? 'Body composition'
    : 'Lichaamssamenstelling'
  }</h2>
  <div class="kpi-grid"><div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">${labels.weight}</div>
      <div class="kpi-value">${endW !== null ? endW.toFixed(1) + ' kg' : '—'}</div>
      <div class="kpi-delta" style="color:${deltaColor(deltaW, true)};">${fmtDelta(deltaW, 'kg')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${labels.bf}</div>
      <div class="kpi-value">${endBF !== null ? endBF.toFixed(1) + ' %' : '—'}</div>
      <div class="kpi-delta" style="color:${deltaColor(deltaBF, true)};">${fmtDelta(deltaBF, '%')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${labels.waist}</div>
      <div class="kpi-value">${endWaist !== null ? endWaist.toFixed(1) + ' cm' : '—'}</div>
      <div class="kpi-delta" style="color:${deltaColor(deltaWaist, true)};">${fmtDelta(deltaWaist, 'cm')}</div>
    </div>
  </div></div>

  <h2>${labels.activity}</h2>
  <div class="kpi-grid"><div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">${labels.workouts}</div>
      <div class="kpi-value">${data.totalWorkouts}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${labels.cardio}</div>
      <div class="kpi-value">${data.totalCardio}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${labels.active_days}</div>
      <div class="kpi-value">${data.activeDays}</div>
    </div>
  </div></div>

  <h2>${labels.prs}</h2>
  <table>
    <thead>
      <tr>
        <th>${labels.exercise}</th>
        <th>${labels.date}</th>
        <th style="text-align:right;">${labels.value}</th>
      </tr>
    </thead>
    <tbody>${prsHtml}</tbody>
  </table>

  <div class="footer">
    ${labels.footer}<br/>
    ${
      locale === 'fr' ? 'Généré automatiquement par l\'app Coach DM' :
      locale === 'en' ? 'Auto-generated by the Coach DM app' :
      'Automatisch gegenereerd door de Coach DM-app'
    }
  </div>
</div>
</body>
</html>`;
}

export function MonthlyReportScreen({ locale = 'fr' }: Props) {
  const [data, setData] = useState<MonthData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      // Calcul mois précédent complet (ex : si on est en mai, on couvre avril)
      const now = new Date();
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const startISO = firstOfLastMonth.toISOString().slice(0, 10);
      const endISO = lastOfLastMonth.toISOString().slice(0, 10);

      const [metricsRes, prsRes, actsRes] = await Promise.all([
        supabase
          .from('body_metrics')
          .select('*')
          .gte('measured_date', startISO)
          .lte('measured_date', endISO)
          .order('measured_at', { ascending: true }),
        supabase
          .from('personal_records')
          .select('*')
          .gte('achieved_at', firstOfLastMonth.toISOString())
          .lt('achieved_at', firstOfThisMonth.toISOString())
          .order('achieved_at', { ascending: false })
          .limit(20),
        supabase
          .from('daily_activity')
          .select('*')
          .gte('day', startISO)
          .lte('day', endISO),
      ]);

      const metrics = (metricsRes.data ?? []) as BodyMetric[];
      const acts = (actsRes.data ?? []) as DailyActivity[];

      const totalWorkouts = acts.reduce((s, a) => s + a.workout_count, 0);
      const totalCardio = acts.reduce((s, a) => s + a.cardio_count, 0);
      const activeDays = acts.filter((a) => a.intensity > 0).length;

      setData({
        startDate: startISO,
        endDate: endISO,
        metricsStart: metrics[0] ?? null,
        metricsEnd: metrics[metrics.length - 1] ?? null,
        prs: (prsRes.data ?? []) as PersonalRecord[],
        activities: acts,
        totalWorkouts,
        totalCardio,
        activeDays,
      });
    })();
  }, []);

  const generatePDF = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      const html = buildHTML(data, locale);
      const fileName = `CoachDM_Report_${data.startDate.slice(0, 7)}`;
      const result = await RNHTMLtoPDF.convert({
        html,
        fileName,
        directory: 'Documents',
        base64: false,
      });
      if (result.filePath) {
        await Share.open({
          url: `file://${result.filePath}`,
          type: 'application/pdf',
          title: 'Coach DM · Rapport mensuel',
          failOnCancel: false,
        });
      }
    } catch (e: any) {
      Alert.alert('PDF error', e.message ?? String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('monthly_report', locale)}</Text>

      {data ? (
        <>
          <Text style={styles.month}>
            {formatMonth(data.startDate + 'T12:00:00Z', locale)}
          </Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>{t('workouts', locale)}</Text>
              <Text style={styles.kpiValue}>{data.totalWorkouts}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>{t('cardio', locale)}</Text>
              <Text style={styles.kpiValue}>{data.totalCardio}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>{t('total_active_days', locale)}</Text>
              <Text style={styles.kpiValue}>{data.activeDays}</Text>
            </View>
          </View>

          {data.metricsStart?.weight_kg !== undefined && data.metricsEnd?.weight_kg !== undefined ? (
            <View style={styles.weightBox}>
              <Text style={styles.boxTitle}>{t('weight', locale)}</Text>
              <Text style={styles.weightLine}>
                {data.metricsStart?.weight_kg ?? '—'} kg → {data.metricsEnd?.weight_kg ?? '—'} kg
              </Text>
            </View>
          ) : null}

          <Text style={styles.prCount}>
            {data.prs.length} {t('personal_records', locale).toLowerCase()}
          </Text>

          <Pressable
            style={[styles.generateBtn, generating && { opacity: 0.5 }]}
            onPress={generatePDF}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={COACH_DM_COLORS.bg} />
            ) : (
              <Text style={styles.generateBtnText}>
                📄 {t('generate_pdf', locale)}
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={COACH_DM_COLORS.gold} style={{ marginTop: 40 }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COACH_DM_COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COACH_DM_COLORS.gold, fontSize: 24, fontWeight: '800' },
  month: { color: COACH_DM_COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginVertical: 8 },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kpi: {
    flex: 1,
    backgroundColor: COACH_DM_COLORS.cardBg,
    padding: 12,
    borderRadius: 10,
  },
  kpiLabel: { color: COACH_DM_COLORS.textSecondary, fontSize: 11 },
  kpiValue: { color: COACH_DM_COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 4 },
  weightBox: { backgroundColor: COACH_DM_COLORS.cardBg, padding: 14, borderRadius: 10, marginTop: 14 },
  boxTitle: { color: COACH_DM_COLORS.gold, fontSize: 13, fontWeight: '700' },
  weightLine: { color: COACH_DM_COLORS.textPrimary, fontSize: 16, marginTop: 6 },
  prCount: { color: COACH_DM_COLORS.textSecondary, fontSize: 13, marginTop: 14 },
  generateBtn: {
    backgroundColor: COACH_DM_COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  generateBtnText: { color: COACH_DM_COLORS.bg, fontSize: 14, fontWeight: '700' },
});
