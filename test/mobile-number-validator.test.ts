import { describe, it, expect, beforeEach, vi } from 'vitest';
import MobileNumberValidationSchemaBuilder from '../src/mobile-number-validator';
import { ZodError } from 'zod';

describe('MobileNumberValidationSchemaBuilder', () => {
  let builder: MobileNumberValidationSchemaBuilder;

  beforeEach(() => {
    builder = new MobileNumberValidationSchemaBuilder();
  });

  it('should validate a correct mobile number and country code', () => {
    const schema = builder.build();
    const result = schema.safeParse({
      mobileNumber: '+254721909893',
      countryCode: 'KE',
    });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid mobile number', () => {
    const schema = builder.build();
    const result = schema.safeParse({
      mobileNumber: 'invalid',
      countryCode: 'KE',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'The mobile number format is incorrect',
      );
    }
  });

  it('should reject an empty country code', () => {
    const schema = builder.build();
    const result = schema.safeParse({
      mobileNumber: '+254721909364',
      countryCode: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'countryCode cannot be empty',
      );
    }
  });

  it('should reject an invalid mobile number for specified country', () => {
    const schema = builder.build();
    const result = schema.safeParse({
      mobileNumber: '+25472100093',
      countryCode: 'US',
    });
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'The mobile number is not valid for the provided countryCode',
      );
    }
  });

  it('should allow changing the mobile number field name', () => {
    const schema = builder.setMobileNumberField('phoneNumber').build();
    const result = schema.safeParse({
      phoneNumber: '+254728932093',
      countryCode: 'KE',
    });
    expect(result.success).toBe(true);
  });

  it('show allow mobile number to be optional when specified', () => {
    const schema = builder.setMobileNumberField('phoneNumber', false).build();
    const result = schema.safeParse({ countryCode: 'KE' });
    expect(result.success).toBe(true);
  });

  it('should allow changing the country code field name', () => {
    const schema = builder.setCountryCodeField('country').build();
    const result = schema.safeParse({
      mobileNumber: '+254723899762',
      country: 'KE',
    });
    expect(result.success).toBe(true);
  });

  it('sbould use custom error messages when provided', () => {
    const schema = builder
      .setCustomErrors({
        invalidFormatError: 'Custom format error',
        emptyCountryCodeError: 'Custom country code error',
      })
      .build();
    const invalidNumberResult = schema.safeParse({
      mobileNumber: 'invalid',
      countryCode: 'KE',
    });
    expect(invalidNumberResult.success).toBe(false);
    if (!invalidNumberResult.success) {
      expect(invalidNumberResult.error.issues[0].message).toBe(
        'Custom format error',
      );
    }
    const emptyCountryCodeResult = schema.safeParse({
      mobileNumber: '+254721099870',
      countryCode: '',
    });
    if (!emptyCountryCodeResult.success) {
      expect(emptyCountryCodeResult.error?.issues[0].message).toBe(
        'Custom country code error',
      );
    }
  });

  it('should call errorHandler when an error is thrown', () => {
    const errorHandlerSpy = vi.spyOn(builder, 'errorHandler');

    const mockError = new Error('Test error');
    vi.spyOn(builder, 'validateMobileNumber').mockImplementation(() => {
      throw mockError;
    });

    expect(() => builder.build()).toThrow(
      'An unexpected error occurred during validation schema creation: Test error. Please check the configuration and try again.',
    );

    expect(errorHandlerSpy).toHaveBeenCalledWith(mockError);
  });

  it('should rethrow ZOdError', () => {
    const zodError = new ZodError([]);
    expect(() => builder.handleErrorWrapper(zodError)).toThrow(ZodError);
  });

  it('should throw specific error for TypeError', () => {
    const typeError = new TypeError('Invalid type');

    expect(() => builder.handleErrorWrapper(typeError)).toThrow(
      'Validation schema creation failed due to a type error: Invalid type. Please check if the fields are correctly typed.',
    );
  });

  it('should throw specific error for generic Error', () => {
    const genericError = new Error('Something went wrong');
    expect(() => builder.handleErrorWrapper(genericError)).toThrow(
      'An unexpected error occurred during validation schema creation: Something went wrong. Please check the configuration and try again.',
    );
  });

  it('should throw specific error for unknown error type', () => {
    const unkownError = 'Some uknown error';
    expect(() => builder.handleErrorWrapper(unkownError)).toThrow(
      'An unexpected unknown error occurred during validation schema creation. Please check the configuration and try again.',
    );
  });
});
