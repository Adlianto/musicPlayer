/**
 * OperationManager.js
 * Pengelola Generation ID / Operation ID untuk membuang hasil operasi asinkron yang telah basi (stale async suppression).
 */

export class OperationManager {
  constructor() {
    this.currentOperationId = 0;
  }

  /**
   * Menghasilkan ID operasi baru dan menginkremen counter internal
   * @returns {number}
   */
  next() {
    this.currentOperationId += 1;
    return this.currentOperationId;
  }

  /**
   * Mengecek apakah token operasi sudah basi/ketinggalan zaman
   * @param {number} operationId
   * @returns {boolean}
   */
  isStale(operationId) {
    return operationId !== this.currentOperationId;
  }

  /**
   * Mengambil ID operasi aktif terkini
   * @returns {number}
   */
  getCurrentId() {
    return this.currentOperationId;
  }
}
