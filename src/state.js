export const DATA = {
  customers: [],
  jobs: [],
  sortMode: "queue",   // "queue" | "startDate" | "expectedDate"
  activeDialog: null,  // null | "job-form" | "customer-form" | "status"
  dialogPayload: null, // data passed to active dialog
  errorMessage: "",
  isLoading: false,
};

export function upsertCustomer(customer) {
  const i = DATA.customers.findIndex((c) => c._id === customer._id);
  if (i === -1) {
    DATA.customers = [...DATA.customers, customer].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else {
    DATA.customers = DATA.customers.map((c, idx) => (idx === i ? customer : c));
  }
}

export function removeCustomer(customerId) {
  DATA.customers = DATA.customers.filter((c) => c._id !== customerId);
}

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

export function getCustomer(customerId) {
  return DATA.customers.find((c) => c._id === customerId) || null;
}
