// index.js
import 'react-native-gesture-handler'; // BU SƏTRİ ƏN BAŞA ƏLAVƏ EDİN
import 'react-native-get-random-values'; // Əgər əlavə etmisinizsə
import 'react-native-url-polyfill/auto'; // BU MÜTLƏQ OLMALIDIR
import { registerRootComponent } from 'expo';
import App from './App'; // Sizin App.js faylınızı import edir

// App komponentini tətbiqin əsas komponenti kimi qeydiyyatdan keçirir
registerRootComponent(App);
