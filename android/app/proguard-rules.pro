# Capacitor WebView
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class org.apache.cordova.CordovaWebView { *; }
-keep class org.apache.cordova.CordovaInterface { *; }

# Keep JavaScript interface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor plugins
-keep class com.getcapacitor.plugins.** { *; }

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
