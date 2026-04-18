export const DATA = {
  MODE: "JOBS",   // "JOBS" | "CUSTOMERS" | "BIKES"
  customers: [],
  jobs: [],
  bikes: [],
  sortMode: "queue",   // "queue" | "startDate" | "expectedDate"
  errorMessage: "",
};

// ── Mode ──────────────────────────────────────────────────────────────────────

export function setMode(mode) {
  DATA.MODE = mode;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export function upsertCustomer(customer) {
  const i = DATA.customers.findIndex((c) => c._id === customer._id);
  if (i === -1) {
    DATA.customers = [...DATA.customers, customer].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    DATA.customers = DATA.customers.map((c, idx) => (idx === i ? customer : c));
  }
}

export function removeCustomer(customerId) {
  DATA.customers = DATA.customers.filter((c) => c._id !== customerId);
}

export function getCustomer(customerId) {
  return DATA.customers.find((c) => c._id === customerId) || null;
}

// ── Bikes ─────────────────────────────────────────────────────────────────────

export function upsertBike(bike) {
  const i = DATA.bikes.findIndex((b) => b._id === bike._id);
  if (i === -1) {
    DATA.bikes = [...DATA.bikes, bike];
  } else {
    DATA.bikes = DATA.bikes.map((b, idx) => (idx === i ? bike : b));
  }
}

export function removeBike(bikeId) {
  DATA.bikes = DATA.bikes.filter((b) => b._id !== bikeId);
}

export function getBike(bikeId) {
  return DATA.bikes.find((b) => b._id === bikeId) || null;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export function setJobs(jobs) {
  DATA.jobs = jobs;
}

export function upsertJob(job) {
  const i = DATA.jobs.findIndex((j) => j._id === job._id);
  if (i === -1) {
    DATA.jobs = [...DATA.jobs, job];
  } else {
    DATA.jobs = DATA.jobs.map((j, idx) => (idx === i ? job : j));
  }
}

export function removeJob(jobId) {
  DATA.jobs = DATA.jobs.filter((j) => j._id !== jobId);
}
