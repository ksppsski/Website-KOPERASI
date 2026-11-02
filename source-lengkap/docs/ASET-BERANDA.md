# Aset beranda: gedung 3D dan logo asli

Perubahan 2 November 2026 mengembalikan identitas asli koperasi sesudah pengguna mengoreksi logo hasil rekonstruksi mockup.

## Sumber logo

- Header, footer dan ikon Ruang Anggota memakai komponen bersama `Brand.svelte`, melalui `LandingBrand.svelte`.
- Terang: `public/assets/kspps-logo-color-web.png` (720 × 255).
- Gelap: `public/assets/kspps-logo-white-web.png` (720 × 256).
- Fasad gedung: `public/assets/kspps-logo-color-hd.png` (2064 × 731).
- PNG berasal dari baseline proyek `6847b45`. Aset web identik dengan logo yang dipakai header awal dan portal. Jangan menggambar ulang simbol atau teks logo memakai AI/font pengganti.
- Ikon kecil memakai pemotongan tampilan PNG asli melalui CSS. Berkas sumber tidak diubah.

## Render gedung

`public/assets/kspps-building-3d.webp` adalah render ilustratif 3D (1200 × 1000, 177054 byte), dibuat memakai builtin `image_gen.imagegen` dalam dua tahap style-transfer. Input awal adalah ilustrasi gedung beranda sebelumnya pada commit `b434c39`. Hasil PNG hanya diubah format, dioptimalkan dan diubah ukuran menjadi WebP. Tidak ada penyuntingan isi melalui Python.

Render tidak memuat logo/tulisan buatan AI. `Hero.svelte` memasang logo HD asli melalui SVG `image` di atas bidang putih dengan transformasi affine. Background HTML img dan SVG memakai pemotongan tengah yang sama dalam `ski-building-scene`. Parallax digerakkan pada scene, sehingga logo tetap menempel pada gedung di desktop/ponsel serta tidak berubah ketika tema berganti. Logo di bidang putih tetap berwarna; logo antarmuka mengikuti tema.

Kartu Ruang Anggota, teks, tombol dan navigasi tetap komponen web. Render ini merupakan visual ilustrasi, bukan dokumentasi foto kantor. Aset gedung lama tidak lagi dipaketkan.

## Prompt tahap pertama

```text
Use case: style-transfer.
Asset type: hero image for the existing KSPPS website, 6:5 landscape composition.
Input image: the referenced local image is the edit target. Keep the same recognizable building, viewpoint and composition, with the building close and filling the frame.

Primary request: transform this building image into a premium architectural 3D render. It must clearly read as beautifully modeled CGI with smooth realistic materials, restrained polish and subtle soft edges, rather than a conventional photograph.
Architecture: preserve the white modern angular building, blue reflective glazing, vertical wooden facade fins at the far right, palms framing the upper left, and neat tropical vegetation in the foreground. Keep the large white facade plane in the upper right in the same position, perspective and scale, with broad unobstructed space for a real logo to be added separately by the web application.
Materials and lighting: matte white architectural surfaces with delicately softened edges, blue glass, warm vertical wood fins, clean 3D foliage, soft daytime light, gentle ambient occlusion, natural contact shadows, calm premium architectural visualization.
Composition: preserve the original 6:5 framing and close street-level upward angle; the building should fill the frame, not become a distant miniature. Keep the large right-hand white facade flat and visually clean.

CRITICAL EDIT: remove every existing letter, brand mark, symbol, signage, plaque and logo from the facade and from the entire image. The white facade must be entirely blank. Do not replace the logo with anything: no text, no symbols, no signage, no placeholder rectangle, no raised relief, no visible remnants. The final image must contain no writing of any kind.
Avoid: miniature diorama, distant isometric view, people, cars, user interface, floating cards, typography, logos, watermarks, placeholders.
```

## Prompt iterasi final

```text
Use case: style-transfer.
Asset type: premium stylized 3D architectural CGI for an adult professional financial-cooperative website.
Input: the referenced building image is the edit target.

Make ONE targeted change: replace the photograph-like rendering with an unmistakably designed, premium 3D computer-generated architectural illustration. The current candidate is too photographic. The final must clearly read as high-quality stylized 3D CGI at a glance, while remaining calm, mature, and professional, NOT a toy or childish cartoon.

STYLE DIRECTION: sculpted architecture, visibly soft beveled edges, velvety smooth matte white architectural materials with no photographic surface noise, clean controlled blue-glass reflections with broad simplified reflected shapes, warm elegant vertical wooden fins, restrained orderly 3D-modelled tropical vegetation with smooth sculpted leaves. Use polished architectural visualization / sophisticated 3D editorial-illustration treatment. Soft studio-daylight illumination, gentle physical ambient occlusion at all joins, crisp natural contact shadows, subtle gradients that reveal the 3D volume. Deliberate rendering, not camera realism. Avoid camera bokeh, film grain, tiny natural leaf texture, or photographic irregularities.

PRESERVE GEOMETRY AND COMPOSITION EXACTLY: same building, same close street-level upward camera angle, same 6:5 hero framing with building filling the image, same large flat blank white facade in the upper right, same perspective and relative facade corner positions, blue windows on left and wood fins on far right, palm framing upper left, planted foreground. The large upper-right facade needs broad clean flat white space for a real logo to be overlaid later in the web application. Do not zoom out or turn the building into an isometric miniature.

ABSOLUTE CONSTRAINT: the facade and entire image must contain NO TEXT, NO LOGO, NO SIGNAGE, NO symbols, NO placeholder plaque, no raised relief or brand-shaped remnants. Leave the large white wall entirely blank and clean. Also no people, vehicles, interface, cards, typography, watermark.
```
