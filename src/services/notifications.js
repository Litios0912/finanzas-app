import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function setupNotifications() {
  if (!Device.isDevice) {
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return false
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios de pago',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    })
  }

  return true
}

export async function schedulePaymentReminders(items, tipo) {
  await cancelPaymentReminders(tipo)

  const now = new Date()
  const today = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  for (const item of items) {
    const diaPago = Number(item.dia_pago)
    if (!diaPago || diaPago < 1 || diaPago > 31) continue

    let notifyDate = new Date(currentYear, currentMonth, diaPago, 9, 0, 0)

    if (diaPago < today) {
      notifyDate = new Date(currentYear, currentMonth + 1, diaPago, 9, 0, 0)
    }

    if (notifyDate <= now) {
      notifyDate = new Date(currentYear, currentMonth + 1, diaPago, 9, 0, 0)
    }

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyDate,
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 Recordatorio: ${item.nombre}`,
        body: `Hoy vence ${item.nombre} — $${Number(item.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        sound: true,
        data: { tipo, itemId: item.id },
      },
      trigger,
    })

    const recurrenteTrigger = {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: diaPago,
      hour: 9,
      minute: 0,
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 Recordatorio: ${item.nombre}`,
        body: `Hoy vence ${item.nombre} — $${Number(item.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        sound: true,
        data: { tipo, itemId: item.id },
      },
      trigger: recurrenteTrigger,
    })
  }
}

export async function cancelPaymentReminders(tipo) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel = scheduled.filter(n => n.content.data?.tipo === tipo)
  await Notifications.cancelScheduledNotificationsAsync(toCancel.map(n => n.identifier))
}

export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Notificación de prueba',
      body: 'Las notificaciones funcionan correctamente',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_RELATED, seconds: 2 },
  })
}
