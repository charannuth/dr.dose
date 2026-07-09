#!/usr/bin/env bash
# Widget extension CFBundleVersion must match the main app (expo-widgets + remote autoIncrement gap).
set -euo pipefail

if [[ "${EAS_BUILD_PLATFORM:-}" != "ios" ]]; then
  exit 0
fi

MAIN_PLIST="ios/DrDose/Info.plist"
WIDGET_PLIST="ios/ExpoWidgetsTarget/Info.plist"

if [[ ! -f "$MAIN_PLIST" || ! -f "$WIDGET_PLIST" ]]; then
  echo "sync-widget-build-number: iOS plists not found, skipping"
  exit 0
fi

MAIN_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$MAIN_PLIST")
MAIN_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$MAIN_PLIST")

echo "sync-widget-build-number: widget → build $MAIN_BUILD, version $MAIN_VERSION"

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $MAIN_BUILD" "$WIDGET_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MAIN_VERSION" "$WIDGET_PLIST"
