import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/+esm";

// I'm wrapping all the code in $(document).ready().
// This is the standard jQuery way to make sure our code only runs after the
// entire HTML document has been loaded and is ready to be manipulated.
$(document).ready(() => {

  // =========================
  // PDF.js SETUP
  // =========================
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.mjs";

  // =========================
  // DOM ELEMENT REFERENCES (jQuery style)
  // The '$' function is the heart of jQuery. We use it to select elements
  // from the page using CSS selectors, just like in a stylesheet.
  // =========================
  const loadBtn = $("#load-sample");
  const fileInput = $("#pdf-input");
  const conceptList = $("#concept-list");
  const workspace = $("#workspace");
  const useMock = $("#use-mock");
  const prevPageBtn = $("#prev-page");
  const nextPageBtn = $("#next-page");
  const pageNum = $("#page-num");
  const pageCount = $("#page-count");
  const pdfCanvas = $("#pdf-canvas")[0]; // pdf.js needs the raw canvas element, not the jQuery object, so we use [0].
  const conceptTemplate = $("#concept-view-template");

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
    await renderPage(currentPage);
  }

  async function renderPage(pageNumber) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.2 });
    const ctx = pdfCanvas.getContext("2d");
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Use jQuery's .text() method to safely update the text content of the page number elements.
    pageNum.text(pageNumber);
    pageCount.text(totalPages);
  }

  // Page navigation using jQuery's .on('click', ...) method. This is how we listen for events.
  prevPageBtn.on("click", () => {
    if (!pdfDoc || currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
  });

  nextPageBtn.on("click", () => {
    if (!pdfDoc || currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
  });

  // Load PDF from file input
  loadBtn.on("click", async () => {
    // .prop('files') is the jQuery way to get the files from a file input element.
    const file = fileInput.prop('files')[0];

    // --- RESET CONCEPT LIST AND WORKSPACE ---
    // .html('') is the jQuery equivalent of .innerHTML = ''
    conceptList.html("");
    workspace.html('<div class="p-3 bg-white rounded-3 h-100 d-flex align-items-center justify-content-center"><div class="workspace-hint">Open a concept from the left to start</div></div>');

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      await loadPDF({ data: arrayBuffer });
      extractConceptsFromPDF(pdfDoc);
      return;
    }

    const defaultPDF = "sample.pdf";
    try {
      await loadPDF(defaultPDF);
      extractConceptsFromPDF(pdfDoc);
    } catch (err) {
      console.error("Failed to load default PDF:", err);
      conceptList.html("<li class='list-group-item text-danger'>Error loading sample PDF</li>");
    }
  });

  // =========================
  // EXTRACT CONCEPTS
  // =========================
// =========================
// EXTRACT CONCEPTS
// =========================
async function extractConceptsFromPDF(pdf) {
  conceptList.html('<li class="list-group-item loading">Extracting concepts, please wait...</li>');
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((t) => t.str).join(" ");
    fullText += text + "\n\n";
  }

  // .is(':checked') is the jQuery way to see if a checkbox is checked.
  if (useMock.is(':checked')) {
    await new Promise((res) => setTimeout(res, 1200));
    const concepts = mockExtractConcepts(fullText);
    showConceptList(concepts);
    return;
  }

  // =========================
  // WARPMIND MODE
  // This is the real version of the concept extraction.
  // I'm keeping the same teaching-style comments you used above.
  // =========================
  const warpMind = new WarpMind({
    baseURL: "https://warp.cs.au.dk/mind",
    apiKey: " " //
  });

  // This is the prompt we send to WarpMind.
  // It takes the full PDF text and asks for a mini-summary + 10 key concepts.
  const prompt = `
Read the full text below, create a short academic summary (3–5 sentences),
and then extract 10 key scientific or technical concepts from that summary.
Ignore personal names and common stop words.

Return ONLY a JSON array like this:
[
  { "name": "concept 1" },
  { "name": "concept 2" }
]

Text:
"""${fullText}"""
`;

  // These “messages” follow the standard WarpMind/ChatML format.
  const messages = [
    { role: "system", content: "You are WarpMind. Extract academic concepts clearly." },
    { role: "user", content: prompt }
  ];

  let responseText = "";

  try {
    // WarpMind supports streaming.  
    // This callback fires every time a chunk of text arrives.
    await warpMind.streamChat(messages, (chunk) => {
      responseText += chunk.content;
      conceptList.find(".loading").text("Processing text with WarpMind…");
    });

    let concepts = [];

    // WarpMind returns plain text, so we attempt to parse it as JSON.
    try {
      concepts = JSON.parse(responseText);
    } catch (err) {
      console.warn("WarpMind did not return valid JSON. Falling back to mock mode.");
      concepts = mockExtractConcepts(fullText);
    }

    showConceptList(concepts);

  } catch (err) {
    console.error("WarpMind request failed:", err);
    showConceptList(mockExtractConcepts(fullText));
  }
}


  // MOCK CONCEPT EXTRACTION (No DOM manipulation, no changes needed)
  function mockExtractConcepts(text) {
    const techSeeds = ["Wireless Networks", "Data Aggregation", "Routing Protocols", "Energy Efficiency", "Signal Processing", "Distributed Systems", "Machine Learning", "Localization", "Sensor Deployment", "Fault Tolerance", "Cloud Integration", "Edge Computing"];
    const picks = techSeeds.sort(() => 0.5 - Math.random()).slice(0, 10);
    return picks.map((name, i) => ({ id: i, name }));
  }

  // Display list of extracted concepts
  function showConceptList(concepts) {
    conceptList.html(""); // Clear the list first
    concepts.forEach((c) => {
      const li = $('<li class="list-group-item list-group-item-action"></li>');
      li.text(c.name);
      // Here, we use .data() to attach the whole concept object to the list item element.
      // This is a clean way to store information without putting it in the HTML itself.
      li.data('concept', c);
      conceptList.append(li);
    });
  }

  // This is event delegation.
  // Because the 'li' elements are created dynamically, we can't attach a click handler to them directly
  // when the page loads. Instead, we attach the handler to the parent ('#concept-list'), which is always there.
  // The handler then only fires when a '.list-group-item-action' inside it is clicked.
  conceptList.on('click', '.list-group-item-action', function() {
    // Inside a jQuery event handler, 'this' refers to the element that triggered the event.
    // We wrap it in $() to get its data.
    const concept = $(this).data('concept');
    openConceptCard(concept);
  });

  // =========================
  // CONCEPT CARD VIEW
  // =========================
  function openConceptCard(concept) {
    // This is a jQuery trick: we take the HTML from our template and wrap it in $()
    // to turn it into a live, interactive jQuery object.
    const card = $(conceptTemplate.html());

    // We can now use .find() to get elements inside our new card.
    card.find(".concept-title").text(concept.name);
    const explanation = card.find(".explanation");
    explanation.text("Generating explanation…").data('concept', concept.name); // Chaining methods together!

    let currentContext = "Theory";

    // Using event delegation again for the buttons inside the card.
    card.on("click", ".toggle-btn", function() {
      // $(this) is the specific button that was clicked.
      $(this).addClass("active").siblings().removeClass("active");
      currentContext = $(this).data("value");
      generateExplanation(getParams(card), explanation);
    });

    function getParams(card) {
      return {
        complexity: Number(card.find(".param-complexity").val()), // .val() gets the value of form elements
        length: Number(card.find(".param-length").val()),
        audience: card.find(".param-audience").val(),
        form: card.find(".param-form").val(),
        tone: card.find(".param-tone").val(),
        context: currentContext,
        examples: card.find(".param-examples").is(':checked'),
        analogy_strength: Number(card.find(".param-analogy").val())
      };
    }

    // Attach a single handler for multiple events on multiple elements. Very efficient!
    card.on("input change", ".param-complexity, .param-length, .param-audience, .param-form, .param-tone, .param-examples, .param-analogy", () => {
      generateExplanation(getParams(card), explanation);
    });

    card.on("click", ".refresh-btn", () => generateExplanation(getParams(card), explanation));

    card.on("click", ".copy-btn", function() {
      navigator.clipboard.writeText(explanation.text());
      $(this).text("Copied!");
      setTimeout(() => $(this).text("Copy"), 800);
    });

    card.on("click", ".close-btn", () => card.remove()); // .remove() deletes the card
    card.on("click", ".duplicate-btn", () => openConceptCard(concept));

    // Remove the hint and append the new card to the workspace
    workspace.find(".workspace-hint").parent().remove();
    workspace.append(card);
    
    // Scroll the workspace to the bottom to show the new card
    workspace.scrollTop(workspace.prop("scrollHeight"));

    generateExplanation(getParams(card), explanation);
  }

  // =========================
  // GENERATE CONCEPT EXPLANATION (This is mostly logic, not much jQuery)
  // =========================
  // =========================
// GENERATE CONCEPT EXPLANATION (This is mostly logic, not much jQuery)
// =========================
async function generateExplanation(params, outputEl) {

  outputEl.text("Generating explanation…").addClass("loading");

  if (useMock.is(':checked')) {
    await new Promise((res) => setTimeout(res, 350));
    const mockText = "Simulated explanation for " + outputEl.data('concept');
    outputEl.text(mockText).removeClass("loading");
    return;
  }

  // =========================
  // REAL WARPMIND MODE
  // This mirrors the previous version of your code.
  // I follow exactly your comment style here too.
  // =========================
  const warpMind = new WarpMind({
    baseURL: "https://warp.cs.au.dk/mind",
    apiKey: " " // key
  });

  const conceptName = outputEl.data("concept");

  // We build the prompt from the card parameters.
  const prompt = `
Explain the concept "${conceptName}" using the following parameters:
${JSON.stringify(params, null, 2)}

Return only the final explanation text, without formatting.
`;

  const messages = [
    { role: "system", content: "You are WarpMind. Produce clear and academically grounded explanations." },
    { role: "user", content: prompt }
  ];

  let responseText = "";

  try {
    // We stream the explanation, updating the UI live.
    await warpMind.streamChat(messages, (chunk) => {
      responseText += chunk.content;
      outputEl.text(responseText);
    });

    outputEl.removeClass("loading");

  } catch (err) {
    console.error("WarpMind explanation failed:", err);
    outputEl.text("Error generating explanation.").removeClass("loading");
  }
}


});
