import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// POST /api/notifications/check — evaluate all active notification rules
// Returns a list of triggered alerts
// ═══════════════════════════════════════════════════════════════

interface TriggeredAlert {
  ruleId: string
  equipmentId: string
  equipmentName: string
  registrationNum: string | null
  conditionType: string
  message: string
  severity: 'warning' | 'critical'
  triggeredAt: string
}

export async function POST() {
  try {
    const rules = await db.notificationRule.findMany({
      where: { isActive: true },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            registrationNum: true,
            type: true,
            trackers: {
              include: {
                sensorData: { orderBy: { timestamp: 'desc' }, take: 20 },
              },
            },
          },
        },
      },
    })

    const alerts: TriggeredAlert[] = []
    const now = new Date()

    for (const rule of rules) {
      const eq = rule.equipment
      const tracker = eq.trackers?.[0] // Primary tracker

      // Cooldown: don't re-trigger within 30 minutes of last trigger
      if (rule.lastTriggeredAt) {
        const minutesSinceLast = (now.getTime() - new Date(rule.lastTriggeredAt).getTime()) / 60000
        if (minutesSinceLast < 30) continue
      }

      let triggered = false
      let message = ''
      let severity: 'warning' | 'critical' = 'warning'

      switch (rule.conditionType) {
        case 'offline': {
          // Tracker is offline (isActive = false)
          if (tracker && !tracker.isActive) {
            triggered = true
            message = `${eq.name} (${eq.registrationNum || '—'}) не в сети`
            severity = 'critical'
          }
          // Also check if no tracker at all
          if (!tracker) {
            triggered = true
            message = `${eq.name} (${eq.registrationNum || '—'}) — нет трекера`
            severity = 'warning'
          }
          break
        }

        case 'not_synced': {
          // No data received for more than thresholdValue hours
          const hours = rule.thresholdValue ?? 1
          if (tracker) {
            const lastSeen = tracker.lastSeenAt || tracker.lastPositionAt || tracker.updatedAt
            const hoursSinceSync = (now.getTime() - new Date(lastSeen).getTime()) / 3600000
            if (hoursSinceSync > hours) {
              triggered = true
              message = `${eq.name} (${eq.registrationNum || '—'}) не синхронизировано более ${Math.round(hoursSinceSync)} ч. (порог: ${hours} ч.)`
              severity = hoursSinceSync > hours * 2 ? 'critical' : 'warning'
            }
          }
          break
        }

        case 'not_moving': {
          // Speed is 0 for more than thresholdValue hours
          const hours = rule.thresholdValue ?? 2
          if (tracker) {
            const lastPosition = tracker.lastPositionAt || tracker.updatedAt
            const hoursSinceMove = (now.getTime() - new Date(lastPosition).getTime()) / 3600000
            if (tracker.lastSpeed === 0 && hoursSinceMove > hours) {
              triggered = true
              message = `${eq.name} (${eq.registrationNum || '—'}) не движется более ${Math.round(hoursSinceMove)} ч. (порог: ${hours} ч.)`
              severity = hoursSinceMove > hours * 2 ? 'critical' : 'warning'
            }
          }
          break
        }

        case 'speed_exceeded': {
          // Speed exceeds thresholdValue km/h
          const maxSpeed = rule.thresholdValue ?? 90
          if (tracker && tracker.lastSpeed != null && tracker.lastSpeed > maxSpeed) {
            triggered = true
            message = `${eq.name} (${eq.registrationNum || '—'}) превышена скорость: ${tracker.lastSpeed} км/ч (порог: ${maxSpeed} км/ч)`
            severity = tracker.lastSpeed > maxSpeed * 1.3 ? 'critical' : 'warning'
          }
          break
        }

        case 'fuel_low': {
          // Fuel level below thresholdValue %
          const minFuel = rule.thresholdValue ?? 15
          if (tracker && tracker.lastFuelLevel != null && tracker.lastFuelLevel < minFuel) {
            triggered = true
            message = `${eq.name} (${eq.registrationNum || '—'}) низкий уровень топлива: ${tracker.lastFuelLevel}% (порог: ${minFuel}%)`
            severity = tracker.lastFuelLevel < minFuel / 2 ? 'critical' : 'warning'
          }
          break
        }

        case 'zone_exit': {
          // This is a placeholder — zone exit requires geofencing which needs additional config
          // For now, we check if the tracker has moved significantly from its last known position
          // This would need geofencing setup in future
          break
        }
      }

      if (triggered) {
        alerts.push({
          ruleId: rule.id,
          equipmentId: eq.id,
          equipmentName: eq.name,
          registrationNum: eq.registrationNum,
          conditionType: rule.conditionType,
          message,
          severity,
          triggeredAt: now.toISOString(),
        })

        // Update lastTriggeredAt
        await db.notificationRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: now },
        }).catch(() => { /* ignore */ })
      }
    }

    return NextResponse.json({ alerts, checkedAt: now.toISOString(), totalRules: rules.length })
  } catch (error) {
    console.error('Error checking notifications:', error)
    return NextResponse.json({ error: 'Failed to check notifications' }, { status: 500 })
  }
}
