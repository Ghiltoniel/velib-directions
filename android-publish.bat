del "production-x86.apk"
del "production-armv7.apk"

CALL cordova build --release android

CALL jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore production.keystore platforms/android/build/outputs/apk/android-x86-release-unsigned.apk alias_name
CALL zipalign -v 4 platforms/android/build/outputs/apk/android-x86-release-unsigned.apk production-x86.apk

CALL jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore production.keystore platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk alias_name
CALL zipalign -v 4 platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk production-armv7.apk