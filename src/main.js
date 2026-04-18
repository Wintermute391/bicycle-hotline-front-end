import { bindBroadcasts, emitSocketRequest, socket } from "./socket.js";
import { DATA, setJobs, upsertBike, upsertCustomer } from "./state.js";
import { renderPage } from "./app.js";

async function bootstrap() {
  try {
    const [customersRes, bikesRes, jobsRes] = await Promise.all([
      emitSocketRequest("crm:customer:list"),
      emitSocketRequest("crm:bike:list"),
      emitSocketRequest("crm:job:list", { sort: DATA.sortMode }),
    ]);

    customersRes.data.customers.forEach(upsertCustomer);
    bikesRes.data.bikes.forEach(upsertBike);
    setJobs(jobsRes.data.jobs);
  } catch (err) {
    DATA.errorMessage = `Failed to load data: ${err.message}`;
  }

  renderPage();
  bindBroadcasts(renderPage);
}

socket.on("connect", () => bootstrap());

if (socket.connected) bootstrap();
