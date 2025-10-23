import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/+esm";

// =========================
// PDF.js SETUP
// =========================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.mjs";

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // DOM ELEMENT REFERENCES
  // =========================
  const loadBtn = document.getElementById("load-sample");
  const fileInput = document.getElementById("pdf-input");
  const conceptList = document.getElementById("concept-list");
  const workspace = document.getElementById("workspace");
  const useMock = document.getElementById("use-mock");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageNum = document.getElementById("page-num");
  const pageCount = document.getElementById("page-count");
  const pdfCanvas = document.getElementById("pdf-canvas");
  const conceptTemplate = document.getElementById("concept-view-template");

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;

  // =========================
  // LOAD AND RENDER PDF
  // =========================
  async function loadPDF(data) {
    const loadingTask = pdfjsLib.getDocument(data);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    renderPage(currentPage);
  }

  async function renderPage(pageNumber) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.2 });
    const ctx = pdfCanvas.getContext("2d");
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    pageNum.textContent = pageNumber;
    pageCount.textContent = totalPages;
  }

  // Page navigation
  prevPageBtn.addEventListener("click", () => {
    if (!pdfDoc || currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
  });
  nextPageBtn.addEventListener("click", () => {
    if (!pdfDoc || currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
  });

  // Load PDF from file input
  loadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    // --- RESET CONCEPT LIST AND WORKSPACE ---
    conceptList.innerHTML = "";
    workspace.innerHTML =
      '<div class="workspace-hint">Open a concept from the left to start</div>';

    // --- Case 1: user uploads a file ---
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      await loadPDF({ data: arrayBuffer });
      extractConceptsFromPDF(pdfDoc);
      return;
    }

    // --- Case 2: no file -> load default PDF ---
    const defaultPDF = "sample.pdf";
    try {
      await loadPDF(defaultPDF);
      extractConceptsFromPDF(pdfDoc);
      console.log("Loaded default sample.pdf");
    } catch (err) {
      console.error("Failed to load default PDF:", err);
      conceptList.innerHTML = "<li class='loading'>Error loading sample PDF</li>";
    }
  });



  // =========================
  // EXTRACT CONCEPTS
  // =========================
  async function extractConceptsFromPDF(pdf) {
    // --- Show loading message ---
    conceptList.innerHTML = '<li class="loading"> Extracting concepts, please wait...</li>';

    let fullText = "";

    // --- Extract all pages' text ---
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((t) => t.str).join(" ");
      fullText += text + "\n\n";
    }

    // --- MOCK MODE ---
    if (useMock.checked) {
      // simulate delay
      await new Promise((res) => setTimeout(res, 1200));
      const concepts = mockExtractConcepts(fullText);
      showConceptList(concepts);
      return;
    }

    // --- WARPMIND MODE ---
    const warpMind = new WarpMind({
      baseURL: "https://warp.cs.au.dk/mind",
      apiKey: "" // your key
    });

    const prompt = `
    Read the full text below, create a short academic summary (3–5 sentences),
    and then extract 10 key scientific or technical concepts from that summary.
    Ignore personal names (e.g., "Andreas", "Priyantha", "Chieh-Jan") and common words like "and", "the", "with".
    Return ONLY a valid JSON array of objects like this:
    [
      { "name": "concept name 1" },
      { "name": "concept name 2" },
      ...
    ]

    Text:
    """${fullText}"""
    `;

    const messages = [
      { role: "system", content: "You are WarpMind. Extract academic concepts clearly." },
      { role: "user", content: prompt }
    ];

    let responseText = "";
    try {
      await warpMind.streamChat(messages, (chunk) => {
        responseText += chunk.content;
        conceptList.querySelector(".loading").textContent =
          "Processing text with WarpMind…";
      });

      let concepts = [];
      try {
        concepts = JSON.parse(responseText);
      } catch (err) {
        console.warn("WarpMind did not return valid JSON. Using mock instead.");
        concepts = mockExtractConcepts(fullText);
      }

      showConceptList(concepts);
    } catch (err) {
      console.error("WarpMind request failed:", err);
      const fallback = mockExtractConcepts(fullText);
      showConceptList(fallback);
    }
  }

  // =========================
  // MOCK CONCEPT EXTRACTION 
  // =========================
  function mockExtractConcepts(text) {
    // create fake summary from text
    const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
    const summary = sentences.slice(0, 5).join(". ");

    // technical-sounding seed words
    const techSeeds = [
      "Wireless Networks", "Data Aggregation", "Routing Protocols",
      "Energy Efficiency", "Signal Processing", "Distributed Systems",
      "Machine Learning", "Localization", "Sensor Deployment",
      "Fault Tolerance", "Cloud Integration", "Edge Computing"
    ];

    // pick 10 unique pseudo-concepts
    const picks = techSeeds.sort(() => 0.5 - Math.random()).slice(0, 10);
    return picks.map((name, i) => ({ id: i, name }));
  }


  // Display list of extracted concepts
  function showConceptList(concepts) {
    conceptList.innerHTML = "";
    concepts.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c.name;
      li.classList.add("concept-item");
      li.addEventListener("click", () => openConceptCard(c));
      conceptList.appendChild(li);
    });
  }


  // =========================
  // CONCEPT CARD VIEW
  // =========================
  function openConceptCard(concept) {
    const clone = conceptTemplate.content.cloneNode(true);
    const card = clone.querySelector(".concept-card");
    const title = card.querySelector(".concept-title");
    const explanation = card.querySelector(".explanation");
    const refreshBtn = card.querySelector(".refresh-btn");
    const copyBtn = card.querySelector(".copy-btn");
    const closeBtn = card.querySelector(".close-btn");
    const dupBtn = card.querySelector(".duplicate-btn");
    const complexity = card.querySelector(".param-complexity");
    const length = card.querySelector(".param-length");
    const audience = card.querySelector(".param-audience");
    const form = card.querySelector(".param-form");
    const tone = card.querySelector(".param-tone");
    const contextBtns = card.querySelectorAll(".toggle-btn");

    // NEW params
    const examplesCheckbox = card.querySelector(".param-examples");
    const analogyRange = card.querySelector(".param-analogy");

    title.textContent = concept.name;
    explanation.textContent = "Generating explanation…";
    explanation.dataset.concept = concept.name;

    let currentContext = "Theory";
    contextBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        contextBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentContext = btn.dataset.value;
        generateExplanation(getParams(), explanation);
      });
    });

    function getParams() {
      return {
        complexity: Number(complexity.value),
        length: Number(length.value),
        audience: audience.value,
        form: form.value,
        tone: tone.value,
        context: currentContext,
        examples: examplesCheckbox.checked,
        analogy_strength: Number(analogyRange.value)
      };
    }

    // Recompute when any param changes
    [complexity, length, audience, form, tone, examplesCheckbox, analogyRange].forEach((p) => {
      p.addEventListener("input", () => generateExplanation(getParams(), explanation));
      p.addEventListener("change", () => generateExplanation(getParams(), explanation));
    });

    refreshBtn.addEventListener("click", () => generateExplanation(getParams(), explanation));

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(explanation.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 800);
    });

    closeBtn.addEventListener("click", () => card.remove());
    dupBtn.addEventListener("click", () => openConceptCard(concept));

    const hint = workspace.querySelector(".workspace-hint");
    if (hint) hint.remove();
    workspace.appendChild(card);
    workspace.scrollTo({ top: workspace.scrollHeight, behavior: "smooth" });
    generateExplanation(getParams(), explanation);
  }

  // =========================
  // GENERATE CONCEPT EXPLANATION 
  // =========================
  async function generateExplanation(params, outputEl) {

    outputEl.textContent = "Generating explanation…";
    outputEl.classList.add("loading");

    // Make a readable summary of current parameters
    function buildParamSummary(p) {
      return (
        `Parameters → ` +
        `Complexity: ${p.complexity}, ` +
        `Length: ${p.length}, ` +
        `Audience: ${p.audience}, ` +
        `Form: ${p.form}, ` +
        `Tone: ${p.tone}, ` +
        `Context: ${p.context}, ` +
        `Examples: ${p.examples ? "Yes" : "No"}, ` +
        `Analogy strength: ${p.analogy_strength}`
      );
    }

    // Build an instruction string for WarpMind
    function buildInstruction(conceptName, paramsObj) {
      const lines = [];
      lines.push(`Explain the concept "${conceptName}".`);
      lines.push(`Complexity: ${paramsObj.complexity} (1 = simplest, 10 = most technical).`);
      lines.push(`Length: approx ${paramsObj.length} sentences.`);
      lines.push(`Audience: ${paramsObj.audience}.`);
      lines.push(`Form: ${paramsObj.form}.`);
      lines.push(`Tone: ${paramsObj.tone}.`);
      lines.push(`Context: ${paramsObj.context}.`);
      lines.push(`Include concrete examples: ${paramsObj.examples ? "Yes" : "No"}.`);
      lines.push(`Analogy strength: ${paramsObj.analogy_strength} (0 = none, 5 = strong).`);
      lines.push(`Return a clear, readable explanation. If form is 'Bulleted', give bullet points.`);
      return lines.join(" ");
    }

    const summaryText = buildParamSummary(params);

    // ========== MOCK MODE ==========
    if (useMock.checked) {
      await new Promise((res) => setTimeout(res, 350));

      const lines = [];
      lines.push(summaryText);
      lines.push(""); // spacer
      lines.push(`${outputEl.dataset.concept} — simulated explanation:`);

      if (params.form === "Prose") {
        for (let i = 0; i < Math.max(1, Math.round(params.length / 3)); i++) {
          let sentence = `Sentence ${i + 1} about ${outputEl.dataset.concept}.`;
          if (params.analogy_strength > 0 && i === 0) {
            sentence += ` (Analogy level ${params.analogy_strength}: imagine it as a ${["tool", "map", "machine", "network", "ecosystem"][params.analogy_strength % 5]}.)`;
          }
          lines.push(sentence);
        }
        if (params.examples) {
          lines.push("Examples: 1) Example A illustrating the concept. 2) Example B with applied context.");
        }
      } else {
        const bullets = Math.max(2, Math.round(params.length / 10));
        for (let b = 0; b < bullets; b++) {
          let bullet = `• Key point ${b + 1} about ${outputEl.dataset.concept}.`;
          if (params.examples && b === 0) bullet += " (example included)";
          lines.push(bullet);
        }
        if (params.analogy_strength > 0) {
          lines.push(`• Analogy: (strength ${params.analogy_strength}) Picture it as ...`);
        }
      }

      outputEl.textContent = lines.join("\n\n");
      outputEl.classList.remove("loading");
      outputEl.style.opacity = 1;
      return;
    }

    // ========== WARPMIND (real) MODE ==========
    const warpMind = new WarpMind({
      baseURL: "https://warp.cs.au.dk/mind",
      apiKey: ""
    });

    const instruction = buildInstruction(outputEl.dataset.concept, params);

    const messages = [
      { role: "system", content: "You are WarpMind. Produce clear academic explanations that obey explicit parameterized instructions." },
      { role: "user", content: instruction }
    ];

    let response = "";
    try {
      await warpMind.streamChat(messages, (chunk) => {
        response += chunk.content;
        outputEl.textContent = summaryText + "\n\n" + response;
      });
    } catch (err) {
      console.error("WarpMind streaming failed:", err);
      outputEl.textContent = summaryText + "\n\n" + "⚠️ Failed to generate via WarpMind — showing fallback.";
      await new Promise((res) => setTimeout(res, 200));
      generateExplanation(params, outputEl); // fallback to mock
      return;
    }

    outputEl.classList.remove("loading");
    outputEl.style.opacity = 1;
  }

});
