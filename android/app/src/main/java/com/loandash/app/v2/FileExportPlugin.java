package com.loandash.app.v2;

import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.util.Base64;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileExport")
public class FileExportPlugin extends Plugin {

    @PluginMethod
    public void exportJson(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename", "backup.json");
        String encoding = call.getString("encoding", "utf8");

        if (data == null || data.isEmpty()) {
            call.reject("No data to export");
            return;
        }

        try {
            byte[] bytes;
            if ("base64".equals(encoding)) {
                bytes = Base64.decode(data, Base64.NO_WRAP);
            } else {
                bytes = data.getBytes("UTF-8");
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, filename.endsWith(".apk") ? "application/vnd.android.package-archive" : "application/json");
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri uri = getContext().getContentResolver().insert(collection, values);

                if (uri == null) {
                    call.reject("Failed to create file in Downloads");
                    return;
                }

                try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
                    if (os == null) {
                        call.reject("Failed to open output stream");
                        return;
                    }
                    os.write(bytes);
                    os.flush();
                }

                ContentValues update = new ContentValues();
                update.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, update, null, null);

            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs();
                }
                File file = new File(downloadsDir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(bytes);
                    fos.flush();
                }
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("path", Environment.DIRECTORY_DOWNLOADS + "/" + filename);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Export failed: " + e.getMessage(), e);
        }
    }
}
