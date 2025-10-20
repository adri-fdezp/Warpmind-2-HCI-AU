// app.js
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
    // Load PDF document using PDF.js
    const loadingTask = pdfjsLib.getDocument(data);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    renderPage(currentPage);
  }

  async function renderPage(pageNumber) {
    // Render a single page of the PDF onto the canvas
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
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      await loadPDF({ data: arrayBuffer });
      extractConceptsFromPDF(pdfDoc);
    } else {
      console.warn("No file selected. Cannot load PDF.");
    }
  });

  // =========================
  // EXTRACT CONCEPTS
  // =========================
  async function extractConceptsFromPDF(pdf) {
    // Combine all text from PDF pages
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((t) => t.str).join(" ");
      fullText += text + " ";
    }

    // Use mock data if checkbox is selected
    if (useMock.checked) {
      const concepts = mockExtractConcepts(fullText);
      showConceptList(concepts);
      return;
    }

    // =========================
    // WarpMind API for concept extraction
    // =========================
    const warpMind = new WarpMind({
      baseURL: "https://warp.cs.au.dk/mind",
      apiKey: "" //add key
    });

    const prompt = `
    Extract 10 core concepts from the following academic paper text.
    Only output a JSON array with objects: { "name": "concept name" }.
    Text: """${fullText}"""
    `;

    const messages = [
      { role: "system", content: "You are WarpMind. Extract academic concepts clearly." },
      { role: "user", content: prompt }
    ];

    let responseText = "";
    await warpMind.streamChat(messages, (chunk) => {
      responseText += chunk.content;
    });

    // Try to parse the response as JSON
    let concepts = [];
    try {
      concepts = JSON.parse(responseText);
    } catch (err) {
      console.warn("Could not parse WarpMind response:", responseText);
      concepts = mockExtractConcepts(fullText); // fallback
    }

    showConceptList(concepts);
  }

  // =========================
  // MOCK CONCEPT EXTRACTION (fallback)
  // =========================
  function mockExtractConcepts(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 6);
    const unique = [...new Set(words)];
    const picks = unique.slice(0, 10);
    return picks.map((w, i) => ({ id: i, name: w }));
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

    // Set concept title and initial explanation
    title.textContent = concept.name;
    explanation.textContent = "Generating explanation...";
    explanation.dataset.concept = concept.name;

    // Context toggle buttons
    let currentContext = "Theory";
    contextBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        contextBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentContext = btn.dataset.value;
        generateExplanation(getParams(), explanation);
      });
    });

    // Collect parameters for generating explanations
    function getParams() {
      return {
        complexity: complexity.value,
        length: length.value,
        audience: audience.value,
        form: form.value,
        tone: tone.value,
        context: currentContext,
      };
    }

    // Update explanation when parameters change
    [complexity, length, audience, form, tone].forEach((p) => {
      p.addEventListener("input", () => generateExplanation(getParams(), explanation));
    });

    refreshBtn.addEventListener("click", () => generateExplanation(getParams(), explanation));
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(explanation.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 800);
    });
    closeBtn.addEventListener("click", () => card.remove());
    dupBtn.addEventListener("click", () => openConceptCard(concept));

    // Remove workspace hint and add the card
    const hint = workspace.querySelector(".workspace-hint");
    if (hint) hint.remove();
    workspace.appendChild(card);

    // Generate explanation immediately
    generateExplanation(getParams(), explanation);
  }

  // =========================
  // GENERATE CONCEPT EXPLANATION
  // =========================
  async function generateExplanation(params, outputEl) {
    outputEl.style.opacity = 0.5;
    outputEl.textContent = "Generating explanation…";

    // Use mock response if checkbox is checked
    if (useMock.checked) {
      await new Promise((res) => setTimeout(res, 300));
      outputEl.textContent = `Concept explanation
      Complexity: ${params.complexity}
      Audience: ${params.audience}
      Tone: ${params.tone}
      Context: ${params.context}
      Form: ${params.form}
      (${params.length} sentences simulated.)`;
      outputEl.style.opacity = 1;
      return;
    }

    // WarpMind API call
    const warpMind = new WarpMind({
      baseURL: "https://warp.cs.au.dk/mind",
      apiKey: "" //add key
    });

    const messages = [
      { role: "system", content: "You are WarpMind. Explain a concept clearly." },
      {
        role: "user",
        content: `Explain "${outputEl.dataset.concept}" with complexity ${params.complexity}, length ${params.length}, audience ${params.audience}, form ${params.form}, tone ${params.tone}, context ${params.context}.`
      }
    ];

    // Stream response from WarpMind
    let response = "";
    await warpMind.streamChat(messages, (chunk) => {
      response += chunk.content;
      outputEl.textContent = response; 
    });

    outputEl.style.opacity = 1;
  }
});
