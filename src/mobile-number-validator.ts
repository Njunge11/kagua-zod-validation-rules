/**
 * @fileoverview Provides a builder class for creating mobile number validation schemas.
 * @author Njunge Njenga <njungedev@gmail.com>
 * @license MIT
 */

import { z, ZodString, ZodOptional } from 'zod';
import {
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  CountryCode,
} from 'libphonenumber-js';

/** Interface for custom error messages in the validation schema. */
interface CustomErrorMessages {
  emptyMobileNumberError?: string;
  emptyCountryCodeError?: string;
  invalidFormatError?: string;
  invalidNumberForCountryError?: string;
}

/**
 * A builder class for creating mobile number validation schemas.
 *
 * This class uses the builder pattern to construct a Zod schema for validating
 * mobile numbers and country codes. It integrates with libphonenumber-js for
 * phone number validation and allows for customization of field names and error messages.
 *
 * @example
 * const schema = new MobileNumberValidationSchemaBuilder()
 *   .setMobileNumberField('phone', true)
 *   .setCountryCodeField('country')
 *   .setCustomErrors({ invalidFormatError: 'Invalid phone format' })
 *   .build();
 */
export default class MobileNumberValidationSchemaBuilder {
  private mobileFieldName: string = 'mobileNumber';
  private countryCodeFieldName: string = 'countryCode';
  private isMobileNumberRequired: boolean = true;
  private customErrorMessages: CustomErrorMessages = {};

  /**
   * Sets the name of the mobile number field and whether it's required.
   *
   * @param {string} name - The name of the mobile number field.
   * @param {boolean} [isRequired=true] - Whether the mobile number is required.
   * @returns {this} The builder instance for method chaining.
   */
  setMobileNumberField(name: string, isRequired: boolean = true): this {
    this.mobileFieldName = name;
    this.isMobileNumberRequired = isRequired;
    return this;
  }

  /**
   * Sets the name of the country code field.
   *
   * @param {string} name - The name of the country code field.
   * @returns {this} The builder instance for method chaining.
   */
  setCountryCodeField(name: string): this {
    this.countryCodeFieldName = name;
    return this;
  }

  /**
   * Sets custom error messages for the validation schema.
   *
   * @param {CustomErrorMessages} messages - An object containing custom error messages.
   * @returns {this} The builder instance for method chaining.
   */
  setCustomErrors(messages: CustomErrorMessages): this {
    this.customErrorMessages = { ...this.customErrorMessages, ...messages };
    return this;
  }

  /**
   * Creates a Zod schema for validating mobile numbers and country codes.
   *
   * @private
   * @param {ZodString | ZodOptional<ZodString>} mobileNumberSchema - The Zod schema for the mobile number.
   * @param {string} emptyCountryCodeError - The error message for an empty country code.
   * @param {string} invalidFormatError - The error message for an invalid mobile number format.
   * @param {string} invalidNumberForCountryError - The error message for a number invalid for the given country.
   * @returns {z.ZodEffects<z.ZodObject<any, any, any>, any, any>} The created Zod schema.
   */
  private validateMobileNumber(
    mobileNumberSchema: ZodString | ZodOptional<ZodString>,
    emptyCountryCodeError: string,
    invalidFormatError: string,
    invalidNumberForCountryError: string,
  ) {
    return z
      .object({
        [this.mobileFieldName]: mobileNumberSchema,
        [this.countryCodeFieldName]: z.string().min(1, emptyCountryCodeError),
      })
      .superRefine((data, ctx) => {
        const mobileNumber = data[this.mobileFieldName];
        const countryCode = data[this.countryCodeFieldName];

        if (!mobileNumber) return;

        if (!isPossiblePhoneNumber(mobileNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [this.mobileFieldName],
            message: invalidFormatError,
          });
          return;
        }

        if (!isValidPhoneNumber(mobileNumber, countryCode as CountryCode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [this.mobileFieldName],
            message: invalidNumberForCountryError,
          });
        }
      });
  }

  /**
   * Handles errors that occur during schema creation.
   *
   * @private
   * @param {unknown} error - The error that occurred.
   * @throws {Error} A more specific error based on the type of error encountered.
   */
  private errorHandler(error: unknown): never {
    if (error instanceof z.ZodError) throw error;

    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';

    if (error instanceof TypeError) {
      throw new Error(
        `Validation schema creation failed due to a type error: ${errorMessage}. Please check if the fields are correctly typed.`,
      );
    } else if (error instanceof Error) {
      throw new Error(
        `An unexpected error occurred during validation schema creation: ${errorMessage}. Please check the configuration and try again.`,
      );
    } else {
      throw new Error(
        'An unexpected unknown error occurred during validation schema creation. Please check the configuration and try again.',
      );
    }
  }

  /**
   * Builds and returns the final Zod validation schema.
   *
   * @returns {z.ZodEffects<z.ZodObject<any, any, any>, any, any>} The created Zod schema.
   * @throws {Error} If an error occurs during schema creation.
   */
  build() {
    try {
      const {
        emptyMobileNumberError = `${this.mobileFieldName} cannot be empty`,
        emptyCountryCodeError = `${this.countryCodeFieldName} cannot be empty`,
        invalidFormatError = 'The mobile number format is incorrect',
        invalidNumberForCountryError = `The mobile number is not valid for the provided ${this.countryCodeFieldName}`,
      } = this.customErrorMessages;

      const mobileNumberSchema = this.isMobileNumberRequired
        ? z.string().min(1, emptyMobileNumberError)
        : z.string().optional();

      return this.validateMobileNumber(
        mobileNumberSchema,
        emptyCountryCodeError,
        invalidFormatError,
        invalidNumberForCountryError,
      );
    } catch (error) {
      return this.errorHandler(error);
    }
  }
}
