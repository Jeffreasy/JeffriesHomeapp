import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LAVENTECARE_PROFILE } from "@/lib/laventecare";
import type { LaventeCareDocument } from "@/lib/laventecare";
import type { LaventeCarePdfDossierContext } from "@/lib/laventecare/pdf/context";
import { getLaventeCarePdfContent } from "@/lib/laventecare/pdf/content";
import {
  getLaventeCarePdfStructuredSections,
  type LaventeCarePdfStructuredBlock,
  type LaventeCarePdfStructuredSection,
} from "@/lib/laventecare/pdf/structured";
import {
  getLaventeCarePdfPalette,
  LAVENTECARE_PDF_FONTS,
  LAVENTECARE_PDF_SPACING,
  type LaventeCarePdfTheme,
} from "@/lib/laventecare/pdf/theme";
import type { LaventeCarePdfVisualTone } from "@/lib/laventecare/pdf/templates";

type Props = {
  document: LaventeCareDocument;
  theme: LaventeCarePdfTheme;
  generatedAt: Date;
  dossierContext?: LaventeCarePdfDossierContext | null;
};

function createStyles(theme: LaventeCarePdfTheme) {
  const colors = getLaventeCarePdfPalette(theme);

  return StyleSheet.create({
    coverPage: {
      backgroundColor: colors.bgDeep,
      color: colors.textPrimary,
      flexDirection: "column",
      minHeight: "100%",
      position: "relative",
    },
    page: {
      backgroundColor: colors.bgBase,
      color: colors.textPrimary,
      paddingHorizontal: LAVENTECARE_PDF_SPACING.pageX,
      paddingTop: LAVENTECARE_PDF_SPACING.pageY,
      paddingBottom: 34,
      position: "relative",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      width: 5,
      height: "100%",
      backgroundColor: colors.teal,
    },
    accentBarRight: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 2,
      height: "100%",
      backgroundColor: colors.emerald,
      opacity: 0.35,
    },
    decor: {
      position: "absolute",
      right: -90,
      top: 150,
      width: 330,
      height: 330,
      borderRadius: 165,
      borderWidth: 1,
      borderColor: colors.teal,
      opacity: theme === "print" ? 0.08 : 0.1,
    },
    topBar: {
      paddingHorizontal: LAVENTECARE_PDF_SPACING.pageX,
      paddingTop: 28,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    logoMark: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.borderAccent,
      backgroundColor: colors.bgSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    logoMarkText: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 9,
      color: colors.tealSoft,
      fontWeight: 700,
    },
    brand: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 11,
      color: colors.tealSoft,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    docType: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: 700,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    coverContent: {
      flex: 1,
      paddingHorizontal: LAVENTECARE_PDF_SPACING.pageX,
      paddingTop: 58,
      paddingBottom: 38,
      justifyContent: "center",
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: colors.bgSurface,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 22,
    },
    badgeText: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8,
      color: colors.tealSoft,
      letterSpacing: 1.8,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    eyebrow: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 10,
      color: colors.tealSoft,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    title: {
      maxWidth: 470,
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 40,
      color: colors.textPrimary,
      fontWeight: 700,
      lineHeight: 1.14,
    },
    accentTitle: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 40,
      color: colors.teal,
      fontWeight: 700,
      lineHeight: 1.12,
    },
    intro: {
      marginTop: 24,
      maxWidth: 462,
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 11.2,
      color: colors.textSecondary,
      lineHeight: 1.6,
    },
    metaGrid: {
      marginTop: 38,
      flexDirection: "row",
      gap: 14,
    },
    metaCard: {
      flex: 1,
      backgroundColor: colors.bgSurface,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderTopWidth: 2,
      borderTopColor: colors.teal,
      padding: 13,
    },
    metaLabel: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.8,
      color: colors.textMuted,
      letterSpacing: 1.3,
      textTransform: "uppercase",
      marginBottom: 5,
    },
    metaValue: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 10.5,
      color: colors.tealSoft,
      fontWeight: 700,
      marginBottom: 3,
    },
    metaSubtext: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.2,
      color: colors.textMuted,
      lineHeight: 1.35,
    },
    bottomStrip: {
      paddingHorizontal: LAVENTECARE_PDF_SPACING.pageX,
      paddingVertical: 17,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
    },
    bottomText: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.5,
      color: colors.textMuted,
    },
    sectionHeader: {
      marginBottom: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 16,
    },
    pageTitle: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 22,
      color: colors.textPrimary,
      fontWeight: 700,
    },
    pageSubtitle: {
      marginTop: 5,
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 9.5,
      color: colors.textMuted,
      lineHeight: 1.4,
    },
    pageTag: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8,
      color: colors.tealSoft,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    section: {
      marginBottom: 16,
      padding: 13,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
    },
    sectionEyebrow: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.8,
      color: colors.tealSoft,
      letterSpacing: 1.3,
      textTransform: "uppercase",
      marginBottom: 4,
      fontWeight: 700,
    },
    sectionTitle: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: 700,
      marginBottom: 6,
    },
    sectionBody: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 9.3,
      color: colors.textSecondary,
      lineHeight: 1.52,
      marginBottom: 8,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
      marginBottom: 4.5,
    },
    bulletDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.teal,
      marginTop: 5.5,
    },
    bulletText: {
      flex: 1,
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.9,
      color: colors.textSecondary,
      lineHeight: 1.45,
    },
    twoColumnGrid: {
      flexDirection: "row",
      gap: 14,
    },
    column: {
      flex: 1,
    },
    checklistItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 7,
      paddingBottom: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    checkMark: {
      width: 15,
      height: 15,
      borderRadius: 4,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMarkText: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      color: colors.tealSoft,
      fontSize: 8,
      fontWeight: 700,
    },
    templateSummary: {
      marginBottom: 16,
      padding: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
      borderLeftWidth: 3,
      borderLeftColor: colors.teal,
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      width: 245,
      minHeight: 82,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
    },
    metricLabel: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      marginBottom: 5,
      fontWeight: 700,
    },
    metricValue: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 4,
      fontWeight: 700,
    },
    metricDetail: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.4,
      color: colors.textMuted,
      lineHeight: 1.38,
    },
    journeyBox: {
      marginBottom: 16,
      padding: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
    },
    journeyStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 8,
    },
    journeyRail: {
      alignItems: "center",
      width: 18,
    },
    journeyDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    journeyIndex: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8,
      color: colors.bgBase,
      fontWeight: 700,
    },
    journeyLine: {
      width: 1,
      height: 16,
      marginTop: 3,
      backgroundColor: colors.borderSubtle,
    },
    journeyBody: {
      flex: 1,
      borderLeftWidth: 1,
      borderLeftColor: colors.borderSubtle,
      paddingLeft: 10,
      paddingBottom: 5,
    },
    journeyTitle: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 9.5,
      color: colors.textPrimary,
      fontWeight: 700,
      marginBottom: 2,
    },
    journeyDetail: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.3,
      color: colors.textMuted,
      lineHeight: 1.4,
    },
    templateTable: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
      overflow: "hidden",
    },
    tableHeader: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.bgCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    tableRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    tableLabel: {
      width: 88,
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8.5,
      color: colors.tealSoft,
      fontWeight: 700,
    },
    tableValue: {
      width: 105,
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8.5,
      color: colors.textPrimary,
      fontWeight: 700,
    },
    tableNote: {
      flex: 1,
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.2,
      color: colors.textSecondary,
      lineHeight: 1.35,
    },
    structuredSection: {
      marginBottom: 13,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgSurface,
    },
    structuredHeader: {
      marginBottom: 9,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    structuredMarker: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.5,
      color: colors.tealSoft,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 3,
    },
    structuredTitle: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: 700,
      marginBottom: 4,
    },
    structuredIntro: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.5,
      color: colors.textMuted,
      lineHeight: 1.4,
    },
    detailBlock: {
      marginBottom: 7,
      padding: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard,
      borderLeftWidth: 3,
      borderLeftColor: colors.teal,
    },
    detailLabel: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8.5,
      color: colors.textPrimary,
      fontWeight: 700,
      marginBottom: 3,
    },
    detailText: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 8.25,
      color: colors.textSecondary,
      lineHeight: 1.38,
    },
    subtleList: {
      marginBottom: 7,
      padding: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
      marginBottom: 4.5,
    },
    listIndex: {
      width: 13,
      height: 13,
      borderRadius: 4,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      textAlign: "center",
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 6.8,
      color: colors.tealSoft,
      fontWeight: 700,
      paddingTop: 2,
    },
    progressGroup: {
      marginBottom: 8,
      gap: 8,
    },
    progressItem: {
      padding: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard,
    },
    progressTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 5,
    },
    progressLabel: {
      flex: 1,
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8.5,
      color: colors.textPrimary,
      fontWeight: 700,
    },
    progressValue: {
      fontFamily: LAVENTECARE_PDF_FONTS.title,
      fontSize: 8.5,
      color: colors.tealSoft,
      fontWeight: 700,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.borderSubtle,
      overflow: "hidden",
      marginBottom: 5,
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.teal,
    },
    progressDetail: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.7,
      color: colors.textMuted,
      lineHeight: 1.35,
    },
    progressBenchmark: {
      marginTop: 2,
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.4,
      color: colors.tealSoft,
      lineHeight: 1.25,
    },
    footer: {
      position: "absolute",
      bottom: 16,
      left: LAVENTECARE_PDF_SPACING.pageX,
      right: LAVENTECARE_PDF_SPACING.pageX,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: 7,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.8,
      color: colors.textMuted,
    },
    footerPage: {
      fontFamily: LAVENTECARE_PDF_FONTS.body,
      fontSize: 7.8,
      color: colors.tealSoft,
      fontWeight: 700,
    },
  });
}

function Footer({ page, theme }: { page: number; theme: LaventeCarePdfTheme }) {
  const s = createStyles(theme);
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>{LAVENTECARE_PROFILE.website} - {LAVENTECARE_PROFILE.email}</Text>
      <Text style={s.footerPage}>{String(page).padStart(2, "0")}</Text>
    </View>
  );
}

function getToneColor(tone: LaventeCarePdfVisualTone, theme: LaventeCarePdfTheme) {
  const colors = getLaventeCarePdfPalette(theme);

  switch (tone) {
    case "success":
      return colors.emerald;
    case "warning":
      return colors.amber;
    case "critical":
      return colors.rose;
    case "muted":
      return colors.textMuted;
    default:
      return colors.teal;
  }
}

function TemplateMetrics({
  content,
  theme,
}: {
  content: ReturnType<typeof getLaventeCarePdfContent>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.metricGrid}>
      {content.template.metrics.map((metric) => {
        const tone = getToneColor(metric.tone, theme);
        return (
          <View key={metric.label} style={[s.metricCard, { borderColor: tone }]}>
            <Text style={[s.metricLabel, { color: tone }]}>{metric.label}</Text>
            <Text style={s.metricValue}>{metric.value}</Text>
            <Text style={s.metricDetail}>{metric.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TemplateJourney({
  content,
  theme,
}: {
  content: ReturnType<typeof getLaventeCarePdfContent>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.journeyBox}>
      <Text style={s.sectionEyebrow}>Flow</Text>
      <Text style={s.sectionTitle}>Documentreis en besluitvorming</Text>
      {content.template.journey.map((step, index) => {
        const tone = getToneColor(step.tone, theme);
        const isLast = index === content.template.journey.length - 1;

        return (
          <View key={`${step.label}-${index}`} style={s.journeyStep}>
            <View style={s.journeyRail}>
              <View style={[s.journeyDot, { backgroundColor: tone }]}>
                <Text style={s.journeyIndex}>{index + 1}</Text>
              </View>
              {!isLast ? <View style={s.journeyLine} /> : null}
            </View>
            <View style={s.journeyBody}>
              <Text style={s.journeyTitle}>{step.label}</Text>
              <Text style={s.journeyDetail}>{step.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TemplateTable({
  content,
  theme,
}: {
  content: ReturnType<typeof getLaventeCarePdfContent>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.templateTable}>
      <View style={s.tableHeader}>
        <Text style={s.sectionEyebrow}>Structuur</Text>
        <Text style={s.sectionTitle}>{content.template.tableTitle}</Text>
      </View>
      {content.template.tableRows.map((row) => (
        <View key={row.label} style={s.tableRow} wrap={false}>
          <Text style={s.tableLabel}>{row.label}</Text>
          <Text style={s.tableValue}>{row.value}</Text>
          <Text style={s.tableNote}>{row.note}</Text>
        </View>
      ))}
    </View>
  );
}

function StructuredList({
  block,
  theme,
}: {
  block: Extract<LaventeCarePdfStructuredBlock, { type: "list" }>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);
  const isSubtle = block.tone === "subtle";

  return (
    <View style={isSubtle ? s.subtleList : undefined}>
      {block.items.map((item, index) => (
        <View key={`${item}-${index}`} style={s.listRow}>
          <Text style={s.listIndex}>{index + 1}</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function StructuredMetricGrid({
  block,
  theme,
}: {
  block: Extract<LaventeCarePdfStructuredBlock, { type: "metric_grid" }>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.metricGrid}>
      {block.items.map((metric) => {
        const tone = getToneColor(metric.tone, theme);

        return (
          <View key={metric.label} style={[s.metricCard, { borderColor: tone }]}>
            <Text style={[s.metricLabel, { color: tone }]}>{metric.label}</Text>
            <Text style={s.metricValue}>{metric.value}</Text>
            <Text style={s.metricDetail}>{metric.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StructuredProgressBars({
  block,
  theme,
}: {
  block: Extract<LaventeCarePdfStructuredBlock, { type: "progress_bars" }>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.progressGroup}>
      {block.items.map((item) => {
        const progress =
          item.value === null || item.max <= 0
            ? 0
            : Math.max(0, Math.min(100, (item.value / item.max) * 100));
        const tone = getToneColor(item.tone, theme);

        return (
          <View key={item.label} style={s.progressItem}>
            <View style={s.progressTop}>
              <Text style={s.progressLabel}>{item.label}</Text>
              <Text style={[s.progressValue, { color: tone }]}>{item.displayValue}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: tone }]} />
            </View>
            <Text style={s.progressDetail}>{item.detail}</Text>
            {item.benchmark ? <Text style={s.progressBenchmark}>{item.benchmark}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function StructuredJourneyFlow({
  block,
  theme,
}: {
  block: Extract<LaventeCarePdfStructuredBlock, { type: "journey_flow" }>;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.journeyBox}>
      {block.items.map((step, index) => {
        const tone = getToneColor(step.tone, theme);
        const isLast = index === block.items.length - 1;

        return (
          <View key={`${step.label}-${index}`} style={s.journeyStep}>
            <View style={s.journeyRail}>
              <View style={[s.journeyDot, { backgroundColor: tone }]}>
                <Text style={s.journeyIndex}>{index + 1}</Text>
              </View>
              {!isLast ? <View style={s.journeyLine} /> : null}
            </View>
            <View style={s.journeyBody}>
              <Text style={s.journeyTitle}>{step.label}</Text>
              <Text style={s.journeyDetail}>{step.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StructuredBlock({
  block,
  theme,
}: {
  block: LaventeCarePdfStructuredBlock;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  switch (block.type) {
    case "detail": {
      const tone = getToneColor(block.tone ?? "primary", theme);

      return (
        <View style={[s.detailBlock, { borderLeftColor: tone }]} wrap={false}>
          <Text style={s.detailLabel}>{block.label}</Text>
          <Text style={s.detailText}>{block.text}</Text>
        </View>
      );
    }
    case "list":
      return <StructuredList block={block} theme={theme} />;
    case "metric_grid":
      return <StructuredMetricGrid block={block} theme={theme} />;
    case "progress_bars":
      return <StructuredProgressBars block={block} theme={theme} />;
    case "journey_flow":
      return <StructuredJourneyFlow block={block} theme={theme} />;
    default:
      return null;
  }
}

function StructuredSection({
  section,
  theme,
}: {
  section: LaventeCarePdfStructuredSection;
  theme: LaventeCarePdfTheme;
}) {
  const s = createStyles(theme);

  return (
    <View style={s.structuredSection} wrap={false}>
      <View style={s.structuredHeader}>
        <Text style={s.structuredMarker}>{section.marker}</Text>
        <Text style={s.structuredTitle}>{section.title}</Text>
        {section.intro ? <Text style={s.structuredIntro}>{section.intro}</Text> : null}
      </View>
      {section.blocks.map((block, index) => (
        <StructuredBlock key={`${section.marker}-${block.type}-${index}`} block={block} theme={theme} />
      ))}
    </View>
  );
}

export function LaventeCarePdfDocument({ document, theme, generatedAt, dossierContext }: Props) {
  const s = createStyles(theme);
  const content = getLaventeCarePdfContent(document, dossierContext);
  const structuredSections = getLaventeCarePdfStructuredSections(document, dossierContext);
  const dateLabel = generatedAt.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`${document.title} - LaventeCare`}
      author={LAVENTECARE_PROFILE.owner}
      subject={document.summary}
      keywords={[document.title, ...document.tags, "LaventeCare"].join(", ")}
      creator="Jeffries Homeapp"
      producer="Jeffries Homeapp LaventeCare PDF Engine"
    >
      <Page size="A4" style={s.coverPage}>
        <View style={s.accentBar} />
        <View style={s.accentBarRight} />
        <View style={s.decor} />

        <View style={s.topBar}>
          <View style={s.brandRow}>
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>LC</Text>
            </View>
            <Text style={s.brand}>{LAVENTECARE_PROFILE.naam}</Text>
          </View>
          <Text style={s.docType}>Document-suite - {theme}</Text>
        </View>

        <View style={s.coverContent}>
          <View style={s.badge}>
            <Text style={s.badgeText}>{content.badge}</Text>
          </View>
          <Text style={s.eyebrow}>{content.eyebrow}</Text>
          <Text style={s.title}>{content.title}</Text>
          <Text style={s.accentTitle}>{content.accentTitle}</Text>
          <Text style={s.intro}>{content.intro}</Text>

          <View style={s.metaGrid}>
            {content.metaCards.map((card) => (
              <View key={card.label} style={s.metaCard}>
                <Text style={s.metaLabel}>{card.label}</Text>
                <Text style={s.metaValue}>{card.value}</Text>
                <Text style={s.metaSubtext}>{card.subtext}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.bottomStrip}>
          <Text style={s.bottomText}>{LAVENTECARE_PROFILE.tagline}</Text>
          <Text style={s.bottomText}>{dateLabel}</Text>
          <Text style={s.bottomText}>{LAVENTECARE_PROFILE.location}</Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.pageTag}>Strategisch kader</Text>
            <Text style={s.pageTitle}>Waarom dit document bestaat</Text>
            <Text style={s.pageSubtitle}>
              Bedrijfscontext, procesfase en professionele inzet voor LaventeCare.
            </Text>
          </View>
          <Text style={s.docType}>{document.key}</Text>
        </View>

        {content.sections.slice(0, 3).map((section) => (
          <View key={section.title} style={s.section} wrap={false}>
            <Text style={s.sectionEyebrow}>{section.eyebrow}</Text>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionBody}>{section.body}</Text>
            {section.bullets.map((bullet) => (
              <View key={bullet} style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

        <Footer page={2} theme={theme} />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.pageTag}>Templateprofiel</Text>
            <Text style={s.pageTitle}>{content.template.label}</Text>
            <Text style={s.pageSubtitle}>
              Gebaseerd op de oude LaventeCare PDF-builder: metrics, flow en controlepunten.
            </Text>
          </View>
          <Text style={s.docType}>{content.template.kind}</Text>
        </View>

        <View style={s.templateSummary}>
          <Text style={s.sectionEyebrow}>Renderprofiel</Text>
          <Text style={s.sectionTitle}>{content.template.summary}</Text>
          <Text style={s.sectionBody}>
            Deze pagina maakt het documenttype expliciet, zodat voorstel-, discovery-, legal-,
            service- en operationsdocumenten niet meer dezelfde generieke layout hoeven te delen.
          </Text>
        </View>

        <TemplateMetrics content={content} theme={theme} />

        <View style={s.twoColumnGrid}>
          <View style={s.column}>
            <TemplateJourney content={content} theme={theme} />
          </View>
          <View style={s.column}>
            <TemplateTable content={content} theme={theme} />
          </View>
        </View>

        <Footer page={3} theme={theme} />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.pageTag}>Documentinhoud</Text>
            <Text style={s.pageTitle}>Professionele inhoudslaag</Text>
            <Text style={s.pageSubtitle}>
              Typed blokken uit de oude builder, geschikt voor AI-context, dossieropbouw en PDF-rendering.
            </Text>
          </View>
          <Text style={s.docType}>{structuredSections.length} secties</Text>
        </View>

        {structuredSections.slice(0, 3).map((section) => (
          <StructuredSection key={section.marker} section={section} theme={theme} />
        ))}

        <Footer page={4} theme={theme} />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.pageTag}>Dossiergebruik</Text>
            <Text style={s.pageTitle}>Van document naar operatie</Text>
            <Text style={s.pageSubtitle}>
              Koppel dit document aan lead, project, besluitvorming en opvolging.
            </Text>
          </View>
          <Text style={s.docType}>Checklist</Text>
        </View>

        <View style={s.twoColumnGrid}>
          <View style={s.column}>
            {content.sections.slice(3).map((section) => (
              <View key={section.title} style={s.section} wrap={false}>
                <Text style={s.sectionEyebrow}>{section.eyebrow}</Text>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={s.sectionBody}>{section.body}</Text>
                {section.bullets.map((bullet) => (
                  <View key={bullet} style={s.bulletRow}>
                    <View style={s.bulletDot} />
                    <Text style={s.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={s.column}>
            <View style={s.section}>
              <Text style={s.sectionEyebrow}>Controlelijst</Text>
              <Text style={s.sectionTitle}>Voor verzending of bespreking</Text>
              {content.checklist.map((item) => (
                <View key={item} style={s.checklistItem}>
                  <View style={s.checkMark}>
                    <Text style={s.checkMarkText}>OK</Text>
                  </View>
                  <Text style={s.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={s.section}>
              <Text style={s.sectionEyebrow}>Volgende stap</Text>
              <Text style={s.sectionTitle}>Maak het operationeel</Text>
              {content.nextSteps.map((item) => (
                <View key={item} style={s.bulletRow}>
                  <View style={s.bulletDot} />
                  <Text style={s.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Footer page={5} theme={theme} />
      </Page>
    </Document>
  );
}
