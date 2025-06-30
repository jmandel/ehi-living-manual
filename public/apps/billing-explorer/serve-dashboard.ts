// Simple HTTP server to serve the dashboard locally
Bun.serve({
  port: 8080,
  fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === "/" ? "/financial-dashboard.html" : url.pathname;
    
    try {
      if (path === "/financial-dashboard.html") {
        return new Response(Bun.file("financial-dashboard.html"), {
          headers: { "Content-Type": "text/html" }
        });
      } else if (path === "/patient_financial_data.json") {
        return new Response(Bun.file("patient_financial_data.json"), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      return new Response("Internal server error", { status: 500 });
    }
  }
});

console.log("Dashboard server running at http://localhost:8080");
console.log("Open this URL in your browser to view the dashboard");