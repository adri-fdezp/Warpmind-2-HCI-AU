# WarpMind Concept Analyzer

## Overview

This project implements a **user interface for extracting and explaining core concepts** from an academic paper using the **WarpMind API**. The interface allows users to load a PDF, visualize it, extract core concepts, and generate detailed explanations for each concept. Users can manipulate parameters such as complexity, length, audience, form, and tone to customize the explanations.  

The UI is built purely with **HTML, CSS, and JavaScript** without any CSS or JS frameworks, following the assignment restrictions.  

---

## Features

1. **Load and view PDF papers**  
   - A sample PDF can be loaded from your local machine.  
   - Optional feature: upload any PDF.  
   - PDF rendering is powered by [PDF.js](https://mozilla.github.io/pdf.js/).  

2. **Automatic extraction of core concepts**  
   - The system extracts 10 core concepts from the paper.  
   - Extraction uses the WarpMind API for real academic concept identification.  
   - Mock mode is available for offline testing.  

3. **Concept view with detailed explanations**  
   - Clicking a concept opens a card showing:  
     - Concept name  
     - WarpMind-generated explanation  
   - Users can manipulate explanation parameters:  
     - **Complexity**: 1–10  
     - **Length**: 5–50 sentences  
     - **Audience**: e.g., Five-year-old, Bachelor, Master, PhD, Policy maker  
     - **Form**: Prose or Bulleted  
     - **Tone**: Neutral, Formal, Conversational, Analogies  
     - **Context toggle**: Theory, Methods, Applications
     - **Example Button**: Adds an example to the explanation
     - **Analogy strength**: level of the analogy

4. **Multiple concept views**  
   - Several concept cards can be opened simultaneously.  
   - Users can duplicate cards to generate alternative explanations for the same concept.  

5. **Improved UI aesthetics**  
   - Modern design with **light blue gradients**, soft shadows, and rounded corners.  
   - Interactive hover effects for concept list and cards.  
   - Fully responsive layout for different screen sizes.  



 
