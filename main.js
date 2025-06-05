// Main Application Entry Point
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('automata-canvas');
    // Ensure canvas dimensions are set correctly if needed
    // canvas.width = canvas.offsetWidth;
    // canvas.height = canvas.offsetHeight;

    let currentAutomata = new FiniteAutomaton(); // Initial instance

    // Initialize the renderer first, then the UI
    const automataRenderer = new CanvasRenderer(canvas, currentAutomata);
    const ui = new UI(automataRenderer, currentAutomata);

    // Make sure the renderer has the initial automata set for drawing
    automataRenderer.setAutomata(currentAutomata);
    automataRenderer.render(); // Initial render

    // You might want to expose some functions globally if needed, e.g., for debugging
    // window.currentAutomata = currentAutomata;
    // window.renderer = automataRenderer;
    // window.ui = ui;
});