package com.loandash.app.v2;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;

@CapacitorPlugin(name = "ContactPicker")
public class ContactPickerPlugin extends Plugin {

    private static final int PICK_CONTACT = 7741;
    private static final int PERMISSION_REQUEST = 7742;
    static ContactPickerPlugin instance;
    private static PluginCall pendingCall;

    @Override
    public void load() {
        instance = this;
        super.load();
    }

    @PluginMethod
    public void pick(PluginCall call) {
        pendingCall = call;
        android.app.Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            pendingCall = null;
            return;
        }

        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(activity,
                    new String[]{ Manifest.permission.READ_CONTACTS }, PERMISSION_REQUEST);
        } else {
            launchPicker();
        }
    }

    public void launchPicker() {
        android.app.Activity activity = getActivity();
        if (activity == null) {
            if (pendingCall != null) {
                pendingCall.reject("Activity unavailable");
                pendingCall = null;
            }
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType(ContactsContract.Contacts.CONTENT_TYPE);
            activity.startActivityForResult(intent, PICK_CONTACT);
        } catch (Exception e) {
            if (pendingCall != null) {
                pendingCall.reject("Could not open contact picker", e);
                pendingCall = null;
            }
        }
    }

    public void handleResult(int resultCode, Intent data) {
        PluginCall call = pendingCall;
        pendingCall = null;

        if (call == null) return;

        if (resultCode != android.app.Activity.RESULT_OK || data == null) {
            call.reject("No contact selected");
            return;
        }

        Uri contactUri = data.getData();
        if (contactUri == null) {
            call.reject("No contact data returned");
            return;
        }

        String name = "";
        String phone = "";

        try {
            ContentResolver resolver = getActivity().getContentResolver();
            if (resolver == null) {
                call.reject("Cannot access content resolver");
                return;
            }

            Cursor cursor = resolver.query(contactUri, null, null, null, null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        int nameIdx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
                        if (nameIdx >= 0) {
                            String n = cursor.getString(nameIdx);
                            if (n != null) name = n;
                        }

                        int idIdx = cursor.getColumnIndex(ContactsContract.Contacts._ID);
                        if (idIdx >= 0) {
                            String contactId = cursor.getString(idIdx);
                            if (contactId != null) {
                                String p = getPhone(resolver, contactId);
                                if (p != null) phone = p;
                            }
                        }
                    }
                } finally {
                    cursor.close();
                }
            }

            JSObject result = new JSObject();
            result.put("name", name);
            result.put("phone", phone);
            call.resolve(result);

        } catch (Exception e) {
            try { call.reject("Failed to read contact: " + e.getMessage()); }
            catch (Exception ignored) {}
        }
    }

    private String getPhone(ContentResolver resolver, String contactId) {
        try {
            Cursor c = resolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{ ContactsContract.CommonDataKinds.Phone.NUMBER },
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                    new String[]{ contactId },
                    null
            );
            if (c != null) {
                try {
                    if (c.moveToFirst()) {
                        String num = c.getString(0);
                        return num != null ? num : "";
                    }
                } finally {
                    c.close();
                }
            }
        } catch (Exception ignored) {}
        return "";
    }
}
