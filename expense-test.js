import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
};

export default function () {
  const payload = JSON.stringify({
    amount: Math.floor(Math.random() * 1000),
    category: 'Food',
    note: 'Lunch',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(
    'http://localhost:3000/api/expenses',
    payload,
    params
  );

  check(res, {
    'status success': (r) =>
      r.status === 200 || r.status === 201,
  });

  sleep(1);
}