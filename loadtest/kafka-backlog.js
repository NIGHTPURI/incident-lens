// Every iteration commits an order/outbox event so the worker's backlog is measurable.
export { options, default, handleSummary } from './workload.js';
