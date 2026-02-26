"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { useForm } from "react-hook-form";
// import { PhoneInput } from "@/components/ui/phone-number-input"
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type FormData = {
	phone: string;
	password: string;
};

export default function LoginPage() {
	const [step, setStep] = useState<"login" | "otp">("otp");

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>();

	const onSubmit = (data: FormData) => {
		console.log(data);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex justify-center items-center min-h-screen bg-gray-100"
		>
			{step === "login" && (
				<Card className="w-[350px]">
					<CardHeader>
						<CardTitle className="text-center font-bold text-xl">Bienvenido a T4</CardTitle>
					</CardHeader>

					<CardContent>
						<CardDescription className="text-center mb-2">
							Ingresa con tu cuenta de Google
						</CardDescription>

						<Button
							type="button"
							className="flex w-full h-12 items-center bg-white text-black border-2 border-black-200 cursor-pointer"
						>
							<svg
								name="Google"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 48 48"
								className="h-5 w-5"
							>
								<title>Google logo</title>
								<path
									fill="#000"
									d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12S17.4 11 24 11c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 5.1 29.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.1-.1-2.1-.4-3.5z"
								/>
							</svg>
							Continuar con Google
						</Button>

						<CardDescription>
							<span className="flex items-center my-4">
								<span className="flex-1 h-px bg-border" />
								<span className="px-4 text-sm text-muted-foreground">O Continua con</span>
								<span className="flex-1 h-px bg-border" />
							</span>
						</CardDescription>

						<CardTitle className="text-sm font-bold mt-5 mb-2">Celular</CardTitle>

						{/* <Input type="tel" className="h-10" onChange={(e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, "")}}></Input>

          <PhoneInput defaultCountry="CO" placeholder="000 0000000"></PhoneInput> */}

						<Input
							{...register("phone", {
								required: "El celular es obligatorio",
								pattern: {
									value: /^[0-9]{10}$/,
									message: "Debe tener 10 números",
								},
							})}
							className="h-10"
							placeholder="Celular"
						/>

						{errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}

						<CardTitle className="flex text-sm font-bold mt-4 mb-2 items-center justify-between">
							Contraseña
							<span className="text-black-200 font-normal cursor-pointer hover:underline">
								¿Olvidaste tu contraseña?
							</span>
						</CardTitle>

						{/* <Input className="h-10" type="password"></Input> */}

						<Input
							type="password"
							placeholder="Contraseña"
							{...register("password", {
								required: "La contraseña es obligatoria",
								minLength: {
									value: 8,
									message: "Debe tener mínimo 8 caracteres",
								},
								pattern: {
									value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
									message: "Debe contener al menos una letra y un número",
								},
							})}
							className="h-10"
						/>

						{errors.password && (
							<p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
						)}
					</CardContent>

					<CardFooter className="grid">
						<Button
							type="submit"
							className="w-full cursor-pointer h-12 border-4 hover:bg-white hover:text-black border-2 border-black-200"
							onClick={() => setStep("login")}
						>
							Continuar
						</Button>
						<CardDescription className="text-center mt-4 mb-4">
							¿No tienes cuenta?{" "}
							<span className="text-black hover:underline cursor-pointer">Crea una</span>
						</CardDescription>
					</CardFooter>
				</Card>
			)}
			{step === "otp" && (
				<Card className="w-[350px]">
					<CardTitle className="text-center font-bold">Codigo OTP</CardTitle>
					<CardDescription className="text-center text-pretty">
						Ingresa el codigo de 6 digitos enviado por SMS a su celular
					</CardDescription>
					<CardContent className="flex justify-center">
						<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
							<InputOTPGroup>
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							className="w-full cursor-pointer h-12 border-4 hover:bg-white hover:text-black border-2 border-black-500"
							onClick={() => setStep("otp")}
						>
							Comprobar
						</Button>
					</CardFooter>
				</Card>
			)}
		</form>
	);
}
