"use client";

import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { buttonVariants } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value" | "ref"> &
	Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
		onChange?: (value: RPNInput.Value) => void;
	};

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> = React.forwardRef<
	React.ElementRef<typeof RPNInput.default>,
	PhoneInputProps
>(({ className, onChange, value, ...props }, ref) => {
	return (
		<RPNInput.default
			ref={ref}
			className={cn("flex", className)}
			flagComponent={FlagComponent}
			countrySelectComponent={CountrySelect}
			inputComponent={InputComponent}
			smartCaret={false}
			value={value || undefined}
			onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
			{...props}
		/>
	);
});
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, ...props }, ref) => (
		<Input className={cn("rounded-e-lg rounded-s-none", className)} {...props} ref={ref} />
	),
);
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
	disabled?: boolean;
	value: RPNInput.Country;
	options: CountryEntry[];
	onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
	disabled,
	value: selectedCountry,
	options: countryList,
	onChange,
}: CountrySelectProps) => {
	const [searchValue, setSearchValue] = React.useState("");
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<Popover
			open={isOpen}
			modal
			onOpenChange={(open) => {
				setIsOpen(open);
				if (open) setSearchValue("");
			}}
		>
			<PopoverTrigger
				disabled={disabled}
				className={cn(
					buttonVariants({ variant: "outline", size: "default" }),
					"flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10",
				)}
			>
				<FlagComponent country={selectedCountry} countryName={selectedCountry} />
				<ChevronsUpDown
					className={cn("-mr-2 size-4 opacity-50", disabled ? "hidden" : "opacity-100")}
				/>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0">
				<Command>
					<CommandInput
						value={searchValue}
						onValueChange={setSearchValue}
						placeholder="Search country..."
					/>
					<CommandList>
						<CommandEmpty>No country found.</CommandEmpty>
						<CommandGroup>
							{countryList.map(({ value, label }) =>
								value ? (
									<CommandItem
										key={value}
										className="gap-2"
										data-checked={value === selectedCountry ? true : undefined}
										onSelect={() => {
											onChange(value);
											setIsOpen(false);
										}}
									>
										<FlagComponent country={value} countryName={label} />
										<span className="flex-1 text-sm">{label}</span>
										<span className="text-foreground/50 text-sm">
											{`+${RPNInput.getCountryCallingCode(value)}`}
										</span>
									</CommandItem>
								) : null,
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
	const Flag = flags[country];

	return (
		<span className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
			{Flag && <Flag title={countryName} />}
		</span>
	);
};

export { PhoneInput };
