"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
} from "@/components/ui/carousel";

const TOTAL_SLIDES = 3;

const buttonLabel = (index: number) => {
	if (index === TOTAL_SLIDES - 1) return "¡Empezar!";
	return "Siguente";
};

export default function OnboardingCarousel() {
	const [api, setApi] = useState<CarouselApi | null>(null);
	const [current, setCurrent] = useState(0);

	const handleSetApi = useCallback((carouselApi: CarouselApi) => {
		if (!carouselApi) return;
		setApi(carouselApi);
		carouselApi.on("select", () => {
			setCurrent(carouselApi.selectedScrollSnap());
		});
	}, []);

	const handleSkip = () => {
		if (!api) return;
		// Salta directo al último slide
		api.scrollTo(TOTAL_SLIDES - 1);
		// O si prefieres salir directamente sin ver el último slide:
		// router.push("/home")
	};

	const handleNext = () => {
		if (!api) return;
		if (current === TOTAL_SLIDES - 1) {
			return;
		}
		api.scrollNext();
	};

	return (
		<div className="flex flex-col items-center justify-center">
			<Carousel setApi={handleSetApi} className="w-screen h-screen flex flex-col">
				<CarouselContent>
					<CarouselItem className="basis-full">
						<div className="bg-[#14b8a6] p-6 text-center h-screen flex flex-col justify-center text-white">
							<div className="text-8xl mb-8 font-sans animate-bounce duration-25 delay-100">🧋</div>
							<h1 className="text-3xl font-bold mb-4 px-6">
								Bienvenido a T4
								<br />
							</h1>
							La mejor experiencia de té de burbujas en tu bolsillo.
						</div>
					</CarouselItem>

					<CarouselItem className="basis-full">
						<div className="bg-[#a855f7] p-6 text-center h-screen flex flex-col justify-center text-white">
							<div className="text-8xl mb-8 font-sans animate-bounce duration-25 delay-100">🎫</div>
							<h1 className="text-3xl font-bold mb-4 px-6">
								Acumula Sellos
								<br />
							</h1>
							Cada compra cuenta. Junta 10 y obtén una bebida GRATIS.
						</div>
					</CarouselItem>

					<CarouselItem className="basis-full">
						<div className="bg-[#6366f1] p-6 text-center h-screen flex flex-col justify-center text-white">
							<div className="text-8xl mb-8 font-sans animate-bounce duration-25 delay-100">🎁</div>
							<h1 className="text-3xl font-bold mb-4 px-6">
								Premios Exclusivos
								<br />
							</h1>
							Ofertas flash, juegos y regalos solo para miembros
						</div>
					</CarouselItem>
				</CarouselContent>

				<div className="absolute bottom-30 left-0 right-0 flex justify-center">
					<Button
						onClick={handleNext}
						className="h-[60px] w-[160px] bg-white text-black-400 text-xl font-bold rounded-full cursor-pointer transform-scale-1"
					>
						{buttonLabel(current)}
					</Button>
				</div>

				{current < TOTAL_SLIDES - 1 && (
					<div className="absolute bottom-20 left-0 right-0 flex justify-center">
						<Button
							onClick={handleSkip}
							variant="ghost"
							className="text-white/70 hover:text-white hover:bg-white/10 hover:font-bold text-sm font-medium cursor-pointer"
						>
							Saltar
						</Button>
					</div>
				)}
			</Carousel>
		</div>
	);
}
