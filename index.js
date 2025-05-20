import 'dotenv/config';
import OpenAI, { toFile } from 'openai';
import express from 'express';
import multer from 'multer';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app  = express();
const upload = multer({ dest: 'uploads/' });

/* ---------- HTML UI ---------- */
const html = /*html*/`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>LeanGen GPT-Image-1 Generator</title>
<link rel="stylesheet" href="default.css">

<style>
  body {
    font-family: system-ui;
    margin: 2rem;
    text-align: center;
    background-color: rgb(95%, 95%, 95%);
  }

  h1 {
    position: absolute;
    font-family: tahoma, system-ui;
    left: 20px;
    top: 30px;
    width: 200px;
    height: 100px;
    font-size: 1.3em;
    color: #999;
    margin: 0;
    padding: 0;
    text-align: left;
  }

  textarea {
    width: 50%;
    min-height: 6rem;
    font-family: system-ui;
    font-size: 110%;
  }

  select,
  input[type="number"] {
    margin-right: 1rem;
    margin-bottom: 0.6rem;
  }

  img {
    max-width: 100%;
    margin-top: 0.5rem;
  }

  #results > div {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #ddd;
  }

  button.generate {
    margin-top: 20px;
    padding: 0.5rem 30px;
    font-size: 1rem;
    font-weight: 600;
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  button.generate:hover {
    background: #005dc1;
  }

  #toggleMoreOptions {
    display: block;
    width: fit-content;
    margin: 0.8rem auto 0;
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }
  #toggleMoreOptions:hover { text-decoration: underline; }

  .moreOptions {
    display: none;
    margin-top: 0.7rem;
    padding-top: 0.3rem;
    border-top: 1px solid #ccc;
  }

  #thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fit, 200px);
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
    margin-bottom: 15px;
  }

  #thumbs img {
    width: 100%;
    object-fit: cover;
    border-radius: 6px;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.25);
  }

  .helpIcon {
    text-decoration: none;
  }
</style>

</head>
<body>

<h1>🎨 LeanGen</h1>

<form id="genForm" enctype="multipart/form-data">
  <textarea name="prompt" placeholder="prompt" required></textarea><br><br>

  <label>Reference images 
    <input type="file" name="refImages" accept="image/*" multiple>
  </label>
  
  <div id="thumbs"></div>
  
  <!-- ------------ Main options ------------- -->
  <div class="mainOptions">
    <label>Size
      <select name="size">
        <option value="auto">🤖 auto</option>
        <option value="1024x1024" selected>🔲 1024×1024</option>
        <option value="1536x1024">↔️ 1536×1024</option>
        <option value="1024x1536">↕️ 1024×1536</option>
      </select>
    </label>
  </div>

  <!-- ---------- Toggler button ---------- -->
  <button type="button" id="toggleMoreOptions" aria-expanded="false">More options ▼</button>

  <!-- ------------ Hidden extra options ------------- -->
  <div class="moreOptions" aria-hidden="true">
    <label>Background
      <select name="background">
        <option value="auto">🤖 auto</option>
        <option value="transparent">transparent</option>
        <option>opaque</option>
      </select>
    </label>

    <label>Moderation
      <select name="moderation">
        <option value="auto">🤖 auto</option>
        <option selected>low</option>
      </select>
    </label>

    <label>Quality
      <select name="quality">
        <option value="auto">🤖 auto</option>
        <option>high</option>
        <option>medium</option>
        <option>low</option>
      </select>
    </label>

    <label>Format
      <select name="output_format">
        <option>png</option>
        <option>jpeg</option>
        <option>webp</option>
      </select>
    </label>

    <label>Compression <input name="output_compression" type="number" min="0" max="100" value="100" style="width:4rem"></label>
    <label># of images <input name="n" type="number" min="1" max="10" value="1" style="width:3rem"></label>

     <a href="https://platform.openai.com/docs/api-reference/images/create" target="_blank" class="helpIcon">🛈</a>
  </div>

  <button class="generate">▶</button>
</form>

<hr>
<div id="results"></div>

<script>
const form    = document.getElementById('genForm');
const results = document.getElementById('results');

form.addEventListener('submit', async e=>{
  e.preventDefault();
  const data = new FormData(form);
  const box  = document.createElement('div');
  box.innerHTML = '<em>Generating…</em>';
  results.prepend(box);

  try {
    const res = await fetch('/generate', { method:'POST', body:data });
    if(!res.ok) throw new Error(await res.text());
    const { images } = await res.json();
    box.innerHTML = '';
    images.forEach(src=>{
      const img = new Image(); img.src = src; box.appendChild(img);
    });
  }
  catch(err) {
    box.innerHTML = '<strong>Error:</strong> ' + err.message;
  }
});

/* ---------- Reference-image thumbnails ---------- */
const fileInput = form.querySelector('input[name="refImages"]');
const thumbs    = document.getElementById('thumbs');

fileInput.addEventListener('change', () => {
  thumbs.innerHTML = '';                              // clear old thumbs
  [...fileInput.files].forEach(file => {
    const url = URL.createObjectURL(file);            // one-liner preview
    const img = new Image(); img.src = url;
    img.onload = () => URL.revokeObjectURL(url);      // free memory after load
    thumbs.appendChild(img);
  });
});

/* ---------- More-options toggler ---------- */
const toggleBtn  = document.getElementById('toggleMoreOptions');
const moreOptsEl = document.querySelector('.moreOptions');

toggleBtn.addEventListener('click', ()=>{
  const isHidden = moreOptsEl.style.display === 'none' || moreOptsEl.style.display === '';
  moreOptsEl.style.display = isHidden ? 'block' : 'none';
  toggleBtn.textContent    = isHidden ? 'Hide options ▲' : 'More options ▼';
  toggleBtn.setAttribute('aria-expanded', String(isHidden));
  moreOptsEl.setAttribute('aria-hidden', String(!isHidden));
});

// ensure hidden on first load (in case CSS failed to load for some reason)
moreOptsEl.style.display = 'none';
</script>

</body>
</html>`;
/* ---------- end HTML UI ---------- */

app.get('/', (_, res)=>res.send(html));

app.post('/generate', upload.array('refImages', 10), async (req, res)=>{
  try {
    const {
      prompt, background, moderation, quality,
      output_format, output_compression, size, n
    } = req.body;

    // helper that appends optional keys only when chosen
    const addIf = (obj, key, val)=>{ if(val!==undefined) obj[key]=val; };

    /* ---------- Build the common option block ---------- */
    const baseOpts = {
      model : 'gpt-image-1',
      prompt,
      n     : Number(n)||1,
      size  : size || 'auto',
    };
    if (background !== 'auto') addIf(baseOpts,'background',background);
    if (moderation !== 'auto') addIf(baseOpts,'moderation',moderation);
    if (quality    !== 'auto') addIf(baseOpts,'quality',quality);
    addIf(baseOpts,'output_format',output_format);
    if (output_compression!=='') addIf(baseOpts,'output_compression',Number(output_compression));

    /* ---------- Decide which endpoint to call ---------- */
    let out;
    if (req.files && req.files.length){                     // === reference-image path ===
      // Convert each upload into an OpenAI "file" (toFile wraps the stream + metadata)
      const openAiImages = await Promise.all(
        req.files.map(async file=>{
          const fileObj = await toFile(
            fs.createReadStream(file.path),
            file.originalname,
            { type: file.mimetype }
          );
          fs.unlink(file.path, ()=>{});                    // tidy tmp file
          return fileObj;
        })
      );

      const editOpts = { ...baseOpts, image: openAiImages };  // key is singular "image" but value can be an array
      out = await openai.images.edit(editOpts);
    }
    else {                                                // === pure-text prompt path ===
      out = await openai.images.generate(baseOpts);
    }

    /* ---------- Return data-URIs back to the browser ---------- */
    const mime   = (output_format || 'png').toLowerCase();
    const images = out.data.map(d=>`data:image/${mime};base64,${d.b64_json}`);
    res.json({ images });
  }
  catch(err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`🚀  Open http://localhost:${PORT} in your browser`));
