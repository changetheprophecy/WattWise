import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { mockReadings, weeklyUsage, recentActivity } from "@/services/mockData";

const C = {
  background: "#F5F7F2",
  surface: "#FFFFFF",
  green: "#123D32",
  greenLight: "#E7F0E9",
  lime: "#B7E36A",
  text: "#26352F",
  muted: "#87918A",
  border: "#E9EDE7",
  orange: "#E9A34B",
};

export default function HomeScreen() {
  const maxUsage = Math.max(...weeklyUsage.map((item) => item.energy));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              WattWise<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.greeting}>Your energy at a glance</Text>
          </View>

          <View style={styles.profile}>
            <Text style={styles.profileText}>W</Text>
          </View>
        </View>

        {/* Connection status */}
        <View style={styles.connectionRow}>
          <View style={styles.connectionLeft}>
            <View style={styles.onlineDot} />
            <Text style={styles.connectionText}>Device connected</Text>
          </View>
          <Text style={styles.deviceId}>{mockReadings.deviceId}</Text>
        </View>

        {/* Main power card */}
        <View style={styles.powerCard}>
          <View style={styles.cardTop}>
            <Text style={styles.powerLabel}>CURRENT POWER</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.powerValueRow}>
            <Text style={styles.powerValue}>
              {mockReadings.power.toFixed(1)}
            </Text>
            <Text style={styles.powerUnit}>W</Text>
          </View>

          <Text style={styles.powerDescription}>
            Power currently being consumed
          </Text>

          <View style={styles.powerDivider} />

          <View style={styles.powerFooter}>
            <View>
              <Text style={styles.footerLabel}>Voltage</Text>
              <Text style={styles.footerValue}>{mockReadings.voltage} V</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>Current</Text>
              <Text style={styles.footerValue}>
                {mockReadings.current.toFixed(2)} A
              </Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>Power factor</Text>
              <Text style={styles.footerValue}>
                {mockReadings.powerFactor.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Today's summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's summary</Text>
          <Text style={styles.todayText}>Today</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Text style={styles.iconText}>ϟ</Text>
            </View>
            <Text style={styles.summaryLabel}>Energy used</Text>
            <Text style={styles.summaryValue}>
              {mockReadings.energy.toFixed(2)}
              <Text style={styles.summaryUnit}> kWh</Text>
            </Text>
            <Text style={styles.summaryHint}>Today's consumption</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.costIcon]}>
              <Text style={styles.costIconText}>৳</Text>
            </View>
            <Text style={styles.summaryLabel}>Estimated cost</Text>
            <Text style={styles.summaryValue}>
              {mockReadings.estimatedCost.toFixed(2)}
              <Text style={styles.summaryUnit}> ৳</Text>
            </Text>
            <Text style={styles.summaryHint}>Based on sample tariff</Text>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Energy consumption</Text>
              <Text style={styles.chartSubtitle}>Your last 7 days</Text>
            </View>
            <Text style={styles.chartUnit}>kWh</Text>
          </View>

          <View style={styles.chart}>
            {weeklyUsage.map((item, index) => {
              const height = (item.energy / maxUsage) * 112;
              const isToday = index === weeklyUsage.length - 1;

              return (
                <View key={item.day} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.energy.toFixed(1)}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height },
                        isToday && styles.activeBar,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.activeDay]}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.activityCount}>Last updates</Text>
        </View>

        <View style={styles.activityCard}>
          {recentActivity.map((item, index) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityIconText}>
                  {index === 0 ? "●" : index === 1 ? "ϟ" : "↗"}
                </Text>
              </View>

              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>

              <Text style={styles.activityValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.bottomNote}>
          WattWise · Smarter energy awareness
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  brand: {
    fontSize: 27,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -1,
  },
  brandDot: {
    color: "#9ACB4D",
  },
  greeting: {
    color: C.muted,
    fontSize: 13,
    marginTop: 3,
  },
  profile: {
    height: 42,
    width: 42,
    borderRadius: 15,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontSize: 17,
    fontWeight: "700",
    color: C.green,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  connectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#48A66B",
  },
  connectionText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600",
  },
  deviceId: {
    color: C.muted,
    fontSize: 11,
  },
  powerCard: {
    backgroundColor: C.green,
    borderRadius: 25,
    padding: 22,
    marginBottom: 27,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  powerLabel: {
    color: "#B6C9BE",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  liveBadge: {
    backgroundColor: "#285447",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    backgroundColor: C.lime,
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  liveText: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  powerValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 15,
  },
  powerValue: {
    fontSize: 54,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -2,
  },
  powerUnit: {
    fontSize: 19,
    color: "#D0DDD5",
    marginLeft: 7,
  },
  powerDescription: {
    color: "#B6C9BE",
    fontSize: 12,
    marginTop: 1,
  },
  powerDivider: {
    height: 1,
    backgroundColor: "#45665A",
    marginVertical: 20,
  },
  powerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLabel: {
    color: "#B6C9BE",
    fontSize: 10,
    marginBottom: 7,
  },
  footerValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  todayText: {
    color: C.green,
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: C.greenLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    padding: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  iconText: {
    fontSize: 22,
    color: C.green,
    fontWeight: "700",
  },
  costIcon: {
    backgroundColor: "#FFF2DF",
  },
  costIconText: {
    fontSize: 18,
    color: C.orange,
    fontWeight: "700",
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 11,
    marginBottom: 7,
  },
  summaryValue: {
    color: C.text,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  summaryUnit: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryHint: {
    color: C.muted,
    fontSize: 9,
    marginTop: 7,
  },
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 26,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  chartUnit: {
    color: C.muted,
    fontSize: 11,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 165,
    marginTop: 15,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barValue: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 7,
  },
  barTrack: {
    height: 112,
    justifyContent: "flex-end",
    width: 19,
  },
  bar: {
    width: 19,
    backgroundColor: "#DCE9DC",
    borderRadius: 7,
  },
  activeBar: {
    backgroundColor: C.green,
  },
  barDay: {
    fontSize: 10,
    color: C.muted,
    marginTop: 9,
  },
  activeDay: {
    color: C.green,
    fontWeight: "800",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  activityCount: {
    color: C.muted,
    fontSize: 10,
  },
  activityCard: {
    backgroundColor: C.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 11,
  },
  activityIcon: {
    height: 33,
    width: 33,
    borderRadius: 11,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconText: {
    color: C.green,
    fontWeight: "800",
    fontSize: 14,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
  },
  activityTime: {
    color: C.muted,
    fontSize: 9,
    marginTop: 4,
  },
  activityValue: {
    color: C.green,
    fontSize: 9,
    fontWeight: "600",
  },
  bottomNote: {
    textAlign: "center",
    color: C.muted,
    fontSize: 10,
    marginTop: 25,
  },
});
