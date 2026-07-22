import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    staff_reads: { executor: 'ramping-vus', stages: [{duration:'30s',target:20},{duration:'2m',target:50},{duration:'30s',target:0}] },
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750'], checks: ['rate>0.99'] },
};

const base=__ENV.BASE_URL||'http://localhost:8000/api/v1';
const token=__ENV.AUTH_TOKEN;
export default function(){
  const headers={Accept:'application/json',Authorization:`Bearer ${token}`};
  const responses=http.batch([
    ['GET',`${base}/sales/orders?per_page=20`,null,{headers}],
    ['GET',`${base}/sales/catalog`,null,{headers}],
    ['GET',`${base}/buses`,null,{headers}],
    ['GET',`${base}/accounting/readiness/runs`,null,{headers}],
  ]);
  responses.forEach(response=>check(response,{'status is 200':r=>r.status===200}));sleep(1);
}
