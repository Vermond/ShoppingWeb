import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export type MockPaymentResult = {
  approved: true;
  amount: Decimal;
};

@Injectable()
export class MockPaymentService {
  authorize(amount: Decimal): MockPaymentResult {
    return {
      approved: true,
      amount,
    };
  }
}
