import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRefund } from '../shared/utils/refundCalculator.js';
import { calculateCredits, validateReservationDuration } from '../shared/utils/reservationRules.js';

const now = new Date('2099-01-01T12:00:00.000Z');

test('reembolsa 100% exactamente a 24 horas', () => {
  assert.deepEqual(calculateRefund(new Date('2099-01-02T12:00:00.000Z'), now, 5), {
    refundPercentage: 100,
    refundedCredits: 5,
  });
});

test('reembolsa 50% exactamente a 2 horas y redondea hacia abajo', () => {
  assert.deepEqual(calculateRefund(new Date('2099-01-01T14:00:00.000Z'), now, 5), {
    refundPercentage: 50,
    refundedCredits: 2,
  });
});

test('no reembolsa por debajo de 2 horas', () => {
  assert.equal(calculateRefund(new Date('2099-01-01T13:59:59.000Z'), now, 8).refundPercentage, 0);
});

test('calcula créditos enteros por tipo de recurso', () => {
  assert.equal(calculateCredits('MEETING_ROOM', 3, 30), 2);
  assert.equal(calculateCredits('HOT_DESK', 1, 240), 1);
  assert.equal(calculateCredits('HOT_DESK', 1, 480), 2);
});

test('valida granularidad y mínimos', () => {
  const start = new Date('2099-02-01T14:00:00.000Z');
  assert.equal(validateReservationDuration('MEETING_ROOM', start, new Date('2099-02-01T14:30:00.000Z')), 30);
  assert.throws(() => validateReservationDuration('HOT_DESK', start, new Date('2099-02-01T16:00:00.000Z')));
  assert.throws(() => validateReservationDuration('DEDICATED_DESK', start, new Date('2099-03-01T14:00:00.000Z')));
});
