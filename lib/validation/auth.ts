import { z } from "zod";

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
const normalizeIdNumber = (value: string) => value.replace(/\s+/g, "");

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, "Display name is required"),
    email: z.string().trim().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .min(10, "Cellphone number is required")
      .transform(normalizePhone)
      .refine((value) => /^(\+27\d{9}|0\d{9})$/.test(value), {
        message: "Enter a valid South African cellphone number",
      }),
    idNumber: z
      .string()
      .trim()
      .min(6, "ID number is required")
      .transform(normalizeIdNumber)
      .refine((value) => /^\d{13}$/.test(value), {
        message: "ID number must be 13 digits",
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    termsAccepted: z.boolean().refine((value) => value, {
      message: "You must accept Terms & Privacy",
    }),
    popiaConsent: z.boolean().refine((value) => value, {
      message: "POPIA consent is required",
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
