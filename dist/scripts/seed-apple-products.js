"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticAppleProducts = void 0;
exports.seedAppleProducts = seedAppleProducts;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const model_1 = __importDefault(require("../app/products/model"));
const model_2 = __importDefault(require("../app/categories/model"));
dotenv_1.default.config();
exports.authenticAppleProducts = [
    // ==================== iPHONE ====================
    {
        categoryName: 'iPhone',
        name: 'iPhone 16 Pro Max',
        price: 24999000,
        description: 'iPhone 16 Pro Max hadir dengan desain titanium kelas kedirgantaraan yang ringan dan kokoh, layar Super Retina XDR 6,9 inci dengan ProMotion 120Hz, dan chip A18 Pro terobosan baru. Dilengkapi kontrol kamera inovatif dan sistem kamera Pro 48 MP Fusion dengan 5x Telefoto untuk hasil tangkapan sinematik memukau.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/94dd0a106c2b5681d4e25e549eb31b1d.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/fe8e7315aef785123a7f5a2c029a3625.png',
            'https://storage.eka-dev.cloud/project/apple-store/images/b51076a7d588e04480d1e36ed554ec21.jpg'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 16 Pro',
        price: 20999000,
        description: 'iPhone 16 Pro ditenagai oleh chip Apple A18 Pro dengan performa grafis luar biasa untuk gaming kelas konsol. Menampilkan layar Super Retina XDR 6,3 inci dengan Dynamic Island, Ceramic Shield generasi terbaru, serta perekaman video 4K 120 fps Dolby Vision.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/f915725ed928104cc272b2493f1adb7f.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/4091c43fb4408589d82e8879af391c69.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/85a283a495496d668d2d0c2f310b7054.jpg'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 16 Plus',
        price: 18499000,
        description: 'iPhone 16 Plus menawarkan layar imersif 6,7 inci dan daya tahan baterai sepanjang hari terbaik di kelasnya. Ditenagai chip A18 dengan efisiensi tinggi, kamera Fusion 48 MP dengan opsi telefoto 2x, serta Tombol Tindakan serbaguna.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/0a9e1a619b6124c4f18892c85e7259d5.webp',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/d982c414b08c5ef3f7cbe18878f68e99.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/da11041b35228b880b97d11b1f99ecc0.png'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 16',
        price: 16499000,
        description: 'iPhone 16 generasi baru dengan chip A18 yang kencang, Kontrol Kamera untuk akses cepat fotografi, dan tombol Tindakan. Dilengkapi kamera Fusion 48 MP ganda dan layar Super Retina XDR 6,1 inci yang memukau dalam berbagai warna cerah.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/51930d9c583c2f8c1f7669e96ebe34fc.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/c7f404f22092473d65bc3cfb8dd7e92e.jpeg',
            'https://storage.eka-dev.cloud/project/apple-store/images/c8494b48710ac7f8ae91de69fbab6881.jpeg'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 15 Pro Max',
        price: 22499000,
        description: 'iPhone 15 Pro Max dengan bodi titanium kuat dan ringan, port USB-C dengan kecepatan USB 3 hingga 10 Gb/s, chip A17 Pro revolusioner, dan zoom optik 5x terpanjang yang pernah ada di iPhone.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/1a3065245bb7fb1008d34a1619716493.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/5824c739c53ddaa5487517850f3cdfef.jpeg',
            'https://storage.eka-dev.cloud/project/apple-store/images/d2d3108a808c5821aebf97be95f2525a.jpg'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 15 Pro',
        price: 18999000,
        description: 'iPhone 15 Pro berdesain titanium aerospace-grade, chip A17 Pro bertenaga, tombol Action yang dapat disesuaikan, dan sistem kamera Pro serbaguna setara tujuh lensa profesional di saku Anda.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/69ec2499589e8c6d9d5f6e3ad634ba50.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/4286e2b558a887e898bf23ce4dafc3d9.jpeg',
            'https://storage.eka-dev.cloud/project/apple-store/images/e1d03133118eef08e327576bf689a8c3.webp'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 15',
        price: 13999000,
        description: 'iPhone 15 menghadirkan Dynamic Island, kamera utama 48 MP beresolusi super tinggi, port USB-C universal, dan kaca belakang bernuansa warna tahan lama dengan tepian berkontur yang nyaman digenggam.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/1ed5f83a30f7d4b4059aa7b61934ec26.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/ed1d22b675c5665daab61e6a243ee7eb.jpeg',
            'https://storage.eka-dev.cloud/project/apple-store/images/f6f11b5024fae552bb28f2cfc624240a.jpeg'
        ]
    },
    {
        categoryName: 'iPhone',
        name: 'iPhone 14',
        price: 11999000,
        description: 'iPhone 14 dilengkapi sistem kamera ganda canggih dengan Photonic Engine untuk pencahayaan rendah luar biasa, mode Aksi untuk video mulus, chip A15 Bionic, dan fitur keselamatan Deteksi Tabrakan.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/55168b9f036d35526eef05979d4cda5e.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/ef9efb0d06111f4fe024ee1ed58d2573.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/f69da4a8de48aee7c3125c69c23813a8.jpg'
        ]
    },
    // ==================== MACBOOK ====================
    {
        categoryName: 'MacBook',
        name: 'MacBook Pro 16" M3 Max',
        price: 57999000,
        description: 'MacBook Pro 16 inci dengan chip Apple M3 Max terkencang, CPU 16-core, GPU 40-core, memori terpadu hingga 128GB, dan layar Liquid Retina XDR 120Hz spektakuler. Dirancang untuk alur kerja komputasi ekstrem dan kreator profesional.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/0fa2082c3de23bbc6a78305b3d6f4fc7.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/c5b40eeb10c2cd588d8d2b3f33d2368e.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/7937c9a73a0a4df0ecb0251be2a2d71d.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/364f034a205cabb624e361002c7fe679.jpg'
        ]
    },
    {
        categoryName: 'MacBook',
        name: 'MacBook Pro 14" M3 Pro',
        price: 34999000,
        description: 'MacBook Pro 14 inci dengan arsitektur chip M3 Pro, Liquid Retina XDR hingga 1600 nits, daya tahan baterai hingga 22 jam, dan sistem pendingin canggih dalam balutan warna Space Black yang menawan.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/ad49b958c4348ab4dd8b3e9f1b147ddd.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/1e32d3e8b950b26df598fe081676ff30.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/1320ba7622f122f1eb8280db4a8bf927.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/8b148f557799e0c69b9e8079f079fb2a.jpg'
        ]
    },
    {
        categoryName: 'MacBook',
        name: 'MacBook Pro 14" M3',
        price: 26999000,
        description: 'MacBook Pro 14 inci bertenaga chip Apple M3 dengan CPU 8-core dan GPU 10-core bertenaga Ray Tracing perangkat keras. Menghadirkan performa pro dalam bentuk portabel dengan layar kelas dunia.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/e8f63d5589497cbe1004394eddcab44e.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/5fdfa7aeb7fcd991430ec2c3afd5dc94.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/69cc06f1fde90cb8689738eef658d8b3.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/bf9d3944b5cfffa428839f2d8649c520.jpg'
        ]
    },
    {
        categoryName: 'MacBook',
        name: 'MacBook Air 15" M3',
        price: 21999000,
        description: 'MacBook Air 15 inci dengan layar Liquid Retina luas 15,3 inci, ketebalan hanya 11,5 mm, chip M3 hemat energi, pengisian daya MagSafe 3, audio 6 speaker dengan Spatial Audio, dan tanpa kipas (senyap total).',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/69f01599d5c9d6e3f383cd66a0c2ef01.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/ba96dc22297d0329f9cec2a0acad045b.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/3c52a0bd646bfdea64b95fe74a251371.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/c5596a9427a6d527e11f7c88cc6a1cda.jpg'
        ]
    },
    {
        categoryName: 'MacBook',
        name: 'MacBook Air 13" M3',
        price: 17999000,
        description: 'Laptop paling populer di dunia kini semakin bertenaga dengan chip M3, dukungan dua layar eksternal saat tertutup, Wi-Fi 6E hingga 2x lebih cepat, serta bodi aluminium daur ulang yang sangat tipis dan ringan.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/eefabe2d85ff067e1039bfbad296fb30.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/7f30eebab873b6b9e9d6db87cd838cce.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/555669779296c1635f90192ff32c0a7d.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/364f034a205cabb624e361002c7fe679.jpg'
        ]
    },
    {
        categoryName: 'MacBook',
        name: 'MacBook Air 13" M2',
        price: 14499000,
        description: 'Didesain ulang sepenuhnya di sekitar chip Apple M2, MacBook Air menggabungkan performa kencang dengan baterai hingga 18 jam, kamera FaceTime HD 1080p, dan layar Liquid Retina 13,6 inci cerah.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/5d656f7b3cea672a9788e6a1d5ccbdfe.jpg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/7929d867b17a1f3a4d7c61736cd7cc67.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/7c82f56a51fc9512aceca7ff7f48a8bf.webp',
            'https://storage.eka-dev.cloud/project/apple-store/images/3b04eef9b9a0fc7fc7eeb807e2c1279c.jpg'
        ]
    },
    // ==================== iPAD ====================
    {
        categoryName: 'iPad',
        name: 'iPad Pro 13" M4',
        price: 24499000,
        description: 'iPad Pro tertipis yang pernah ada dengan layar Ultra Retina XDR berbasis teknologi Tandem OLED tercanggih di dunia. Ditenagai chip Apple M4 generasi berikutnya untuk kemampuan AI on-device revolusioner.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/67f0ce335bc244f83dcec1508d5f48a9.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/b4bc738d8984b7fff256b2a29044fbde.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/8b4ae3c7172466f021e5e2831d9f56dc.jpg'
        ]
    },
    {
        categoryName: 'iPad',
        name: 'iPad Pro 11" M4',
        price: 19499000,
        description: 'Performa sekelas komputer desktop dalam genggaman. Menampilkan chip M4 dengan Neural Engine berkecepatan 38 TOPS, layar Ultra Retina XDR 120Hz ProMotion, dan kompatibel dengan Apple Pencil Pro terbaru.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/864aa20cea6eedeaaa1791edd27e9542.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/ed8ddb8a7c1857973b542eb92e3d842a.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/0be814b20174a286bb83e4ffacb0ed3a.jpg'
        ]
    },
    {
        categoryName: 'iPad',
        name: 'iPad Air 13" M2',
        price: 15999000,
        description: 'iPad Air kini hadir dalam ukuran layar 13 inci yang luas dengan chip Apple M2. Sangat bertenaga untuk menggambar, multitasking dengan Stage Manager, dan bermain game grafis tinggi.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/d583f2e1654bb9001be5abe84bfe177c.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/67819496fc3ae4e059764ba8559f815d.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/c9254afb33b5418f5492d15ebbcd836a.jpg'
        ]
    },
    {
        categoryName: 'iPad',
        name: 'iPad Air 11" M2',
        price: 11999000,
        description: 'iPad Air 11 inci ditenagai chip M2 dengan CPU 8-core dan GPU 10-core. Dilengkapi kamera lanskap 12 MP dengan Center Stage, Touch ID di tombol atas, serta port USB-C serbaguna.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/6ac02029800e457da396426f321ef2dd.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/70f0d6c5897750566b04b34d1149c7d1.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/9541eedd54624b58b609ba61bba9666c.jpg'
        ]
    },
    {
        categoryName: 'iPad',
        name: 'iPad 10th Generation',
        price: 6999000,
        description: 'iPad penuh warna dengan layar Liquid Retina 10,9 inci tanpa tombol Home, chip A14 Bionic, kamera belakang dan depan 12 MP, port USB-C, serta dukungan untuk Magic Keyboard Folio dan Apple Pencil.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/5c0dd990a8b372321e4fc10994c50f22.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/3fe2f5a0b15b34ad44b83e11974e37cd.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/238d2731f1c4c37f49e8c6d7687c0592.jpg'
        ]
    },
    {
        categoryName: 'iPad',
        name: 'iPad mini 6',
        price: 8499000,
        description: 'Kemampuan besar dalam ukuran mini yang pas di saku. Desain layar penuh 8,3 inci, chip A15 Bionic, konektivitas USB-C cepat, dan dukungan Apple Pencil generasi kedua yang menempel secara magnetis.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/048d1a7b1ae5ffe6337d81e4f691fbcb.png',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/7c48aed01cf3f288d709aa484fd9389e.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/df7acf5813c955a8f1dea399fddd2a0b.jpg'
        ]
    },
    // ==================== APPLE WATCH ====================
    {
        categoryName: 'Apple Watch',
        name: 'Apple Watch Ultra 2',
        price: 15999000,
        description: 'Jam tangan olahraga paling tangguh dan andal dari Apple. Case titanium 49 mm tahan air hingga 100 m, layar Retina Always-On 3.000 nits tercerah, GPS frekuensi ganda presisi, dan baterai hingga 72 jam dalam mode daya rendah.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/1997f624733828d2a1f05330cdc726dd.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/31219c64b093242fa6e8ac31ef0d2cd3.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/bb0b5973257973ff5eeacc4cae5150cd.jpg'
        ]
    },
    {
        categoryName: 'Apple Watch',
        name: 'Apple Watch Series 10',
        price: 8499000,
        description: 'Pembaruan terbesar dalam sejarah Apple Watch. Desain tertipis dengan layar OLED sudut lebar terbesar, sensor kedalaman & suhu air baru, pengisian daya cepat hingga 80% dalam 30 menit, dan chip S10 SiP.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/d0dc28c452287c5a109bc0bd20075c28.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/d8427a48f10ea084644c2fa216d3f16a.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/247c1723bf3b5281bee48d15b86b5851.jpg'
        ]
    },
    {
        categoryName: 'Apple Watch',
        name: 'Apple Watch Series 9',
        price: 6999000,
        description: 'Ditenagai chip S9 SiP dengan gestur ketuk dua kali (Double Tap) ajaib, layar Always-On 2.000 nits 2x lebih terang, Siri on-device lebih cepat dan privat, serta fitur pelacakan kesehatan komprehensif (EKG, Oksigen Darah).',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/f614535f828ea9e4c865a07c42bc4a15.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/f88d43711d43a71b657d644003474b84.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/5bc08b8e0671372ef1a08f3da0b2c52c.jpg'
        ]
    },
    {
        categoryName: 'Apple Watch',
        name: 'Apple Watch SE 2nd Gen',
        price: 4299000,
        description: 'Semua esensial Apple Watch dalam harga paling terjangkau. Deteksi Tabrakan, pelacakan aktivitas harian, notifikasi detak jantung tinggi/rendah, dan tahan air hingga kedalaman 50 meter.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/9f92099da385d01ecd5654bcade27d3a.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/d32506375556f8041d165a6ec3c555b9.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/364bb2d6094488fb4040e570b56d680b.jpg'
        ]
    },
    {
        categoryName: 'Apple Watch',
        name: 'Apple Watch Series 8',
        price: 5499000,
        description: 'Menghadirkan sensor suhu tubuh mutakhir untuk wawasan kesehatan wanita mendalam, Deteksi Tabrakan untuk bantuan darurat otomatis, serta pelacakan tidur dan aplikasi Latihan yang disempurnakan.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/6d70364d7afdb075fcdd95b2bb9c970f.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/d667f5f1a13d22618af745112649fa65.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/a12757b90eed686ce046d331bc3d99b0.jpg'
        ]
    },
    // ==================== AIRPODS ====================
    {
        categoryName: 'AirPods',
        name: 'AirPods Max (USB-C)',
        price: 9499000,
        description: 'Headphone over-ear nirkabel premium dengan Active Noise Cancellation pro tingkat industri, mode Transparansi, Audio Spasial personal dengan pelacakan kepala dinamis, konektivitas USB-C baru, dan kanopi jaring berpori mewah.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/803ceca58742811fad29037a090b1bb3.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/953bc0b86418c754ce15e5c6217e8936.png',
            'https://storage.eka-dev.cloud/project/apple-store/images/06e2ded29817501e18efec3ff0f384ea.jpg'
        ]
    },
    {
        categoryName: 'AirPods',
        name: 'AirPods Pro 2nd Gen (USB-C)',
        price: 3999000,
        description: 'Ditenagai chip Apple H2 dengan Peredam Kebisingan Aktif hingga 2x lebih baik, Audio Adaptif pintar, Mode Transparansi, casing MagSafe USB-C dengan speaker internal dan loop tali pengikat, serta ketahanan debu IP54.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/803ceca58742811fad29037a090b1bb3.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/06e2ded29817501e18efec3ff0f384ea.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/30ca1a5f2b253884c537a5da75004ee5.jpeg'
        ]
    },
    {
        categoryName: 'AirPods',
        name: 'AirPods 4 ANC',
        price: 2999000,
        description: 'AirPods dengan desain open-ear pertama yang menghadirkan fitur Active Noise Cancellation, Audio Adaptif, dan Mode Transparansi. Ditenagai chip H2 dengan casing nirkabel terkecil yang dilengkapi speaker internal.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/6acaa3d743ed368c15d0dfea5474c94d.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/84dcd67e7a0e4c5673d15ba12d2314fa.png',
            'https://storage.eka-dev.cloud/project/apple-store/images/714b22a354dfa0a99fd5f5712b12d793.jpg'
        ]
    },
    {
        categoryName: 'AirPods',
        name: 'AirPods 4',
        price: 2299000,
        description: 'Pengalaman audio nirkabel terbaik dengan bentuk yang disempurnakan untuk kenyamanan sepanjang hari. Didukung chip H2 untuk kualitas suara sejernih kristal, isolasi suara saat telepon, dan kontrol sensor tekanan.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/6acaa3d743ed368c15d0dfea5474c94d.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/84dcd67e7a0e4c5673d15ba12d2314fa.png',
            'https://storage.eka-dev.cloud/project/apple-store/images/f967e9c2c235af1b885228adff44e102.jpeg'
        ]
    },
    {
        categoryName: 'AirPods',
        name: 'AirPods 3rd Gen',
        price: 2499000,
        description: 'Dilengkapi Audio Spasial personal dengan pelacakan kepala dinamis, sensor deteksi kulit cerdas, ketahanan air dan keringat IPX4, serta daya tahan baterai hingga 30 jam pemutaran total bersama casing pengisian daya MagSafe.',
        image_thumbnail: 'https://storage.eka-dev.cloud/project/apple-store/images/6acaa3d743ed368c15d0dfea5474c94d.jpeg',
        image_details: [
            'https://storage.eka-dev.cloud/project/apple-store/images/714b22a354dfa0a99fd5f5712b12d793.jpg',
            'https://storage.eka-dev.cloud/project/apple-store/images/f967e9c2c235af1b885228adff44e102.jpeg'
        ]
    }
];
function seedAppleProducts() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Seeding official Apple categories...');
        const categoryNames = ['iPhone', 'MacBook', 'iPad', 'Apple Watch', 'AirPods'];
        const catMap = {};
        for (const name of categoryNames) {
            let cat = yield model_2.default.findOne({ name });
            if (!cat) {
                cat = yield model_2.default.create({ name });
                console.log(`  + Created category: ${name}`);
            }
            else {
                console.log(`  * Existing category: ${name}`);
            }
            catMap[name] = cat._id;
        }
        console.log('\nCleaning old products...');
        yield model_1.default.deleteMany({});
        console.log('Old products cleared.');
        console.log('\nInserting 30 authentic Apple products...');
        const docs = exports.authenticAppleProducts.map((item) => ({
            name: item.name,
            price: item.price,
            description: item.description,
            category: catMap[item.categoryName],
            image_thumbnail: item.image_thumbnail,
            image_details: item.image_details,
        }));
        const inserted = yield model_1.default.insertMany(docs);
        console.log(`Successfully seeded ${inserted.length} authentic Apple products!`);
    });
}
if (require.main === module) {
    const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
    mongoose_1.default.connect(dbUri).then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield seedAppleProducts();
        yield mongoose_1.default.disconnect();
        process.exit(0);
    })).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
