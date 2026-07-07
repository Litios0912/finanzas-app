import React from 'react'
import { View, Text, Dimensions, StyleSheet } from 'react-native'
import Svg, { Path, Circle, G } from 'react-native-svg'

const screenWidth = Dimensions.get('window').width - 64

const COLORS_PALETTE = [
  '#EF4444', '#F59E0B', '#3B82F6', '#10B981',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#A855F7',
]

export function PieChart({ data }) {
  if (!data || data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  let cumulativePercent = 0
  const segments = data.map((d, i) => {
    const percent = d.value / total
    const startAngle = cumulativePercent * 360
    cumulativePercent += percent
    return {
      ...d,
      percent,
      startAngle,
      endAngle: cumulativePercent * 360,
      color: d.color || COLORS_PALETTE[i % COLORS_PALETTE.length],
    }
  })

  const size = screenWidth * 0.6
  const radius = size / 2
  const innerRadius = radius * 0.55

  const toRad = (deg) => (deg * Math.PI) / 180

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const angleRad = toRad(angleDeg - 90)
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    }
  }

  const describeArc = (cx, cy, r, startDeg, endDeg) => {
    const start = polarToCartesian(cx, cy, r, endDeg)
    const end = polarToCartesian(cx, cy, r, startDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Distribución de Gastos</Text>
      <View style={styles.pieWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation={-90} origin={`${radius}, ${radius}`}>
            {segments.map((seg, i) => (
              <Path
                key={i}
                d={describeArc(radius, radius, radius, seg.startAngle, seg.endAngle)}
                fill={seg.color}
              />
            ))}
          </G>
          <Circle cx={radius} cy={radius} r={innerRadius} fill="#fff" />
        </Svg>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterAmount}>${total.toFixed(0)}</Text>
          <Text style={styles.pieCenterLabel}>Total</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{seg.label}</Text>
            <Text style={styles.legendValue}>
              ${seg.value.toFixed(0)} ({(seg.percent * 100).toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function BarChart({ data, title }) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <View style={styles.barWrapper}>
        {data.map((d, i) => {
          const height = (d.value / maxValue) * 140
          return (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>${(d.value / 1000).toFixed(1)}k</Text>
              <View style={[styles.bar, { height: Math.max(height, 4), backgroundColor: COLORS_PALETTE[i % COLORS_PALETTE.length] }]} />
              <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  pieCenterAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  pieCenterLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  legend: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  legendValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  barWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  bar: {
    width: 28,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
})
