import { bindBroadcasts, emitSocketRequest, socket } from "./socket.js";
import { DATA, setJobs, upsertCustomer } from "./state.js";
import { renderPage } from "./app.js";

async function bootstrap() {
  try {
    DATA.isLoading = true;

    const [customersRes, jobsRes] = await Promise.all([
      emitSocketRequest("crm:customer:list"),
      emitSocketRequest("crm:job:list", { sort: DATA.sortMode }),
    ]);

    customersRes.data.customers.forEach(upsertCustomer);
    setJobs(jobsRes.data.jobs);
  } catch (err) {
    DATA.errorMessage = `Failed to load data: ${err.message}`;
  } finally {
    DATA.isLoading = false;
  }

  renderPage();
  bindBroadcasts(renderPage);
}

socket.on("connect", () => {
  bootstrap();
});

// If already connected when this module loads
if (socket.connected) {
  bootstrap();
}
