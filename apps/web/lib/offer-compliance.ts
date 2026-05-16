export const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"]
] as const;

export type StateCode = (typeof US_STATES)[number][0];

const stateNames = new Map<string, string>(US_STATES.map(([code, name]) => [code, name]));

export function stateName(code: string) {
  return stateNames.get(code) ?? code;
}

export function federalComplianceText(companyName: string, eVerifyNumber?: string | null) {
  return `FEDERAL EMPLOYMENT COMPLIANCE

${companyName} complies with applicable federal employment requirements, including the Fair Labor Standards Act, Form I-9 employment eligibility verification, anti-discrimination obligations enforced by the EEOC, workplace accommodation requirements under the ADA where applicable, employee benefit plan rules where applicable, federal tax withholding requirements, and employee data protection expectations. New hires must complete Form I-9 on or before the first day of employment and provide acceptable work authorization documents. ${eVerifyNumber ? `${companyName} identifies its E-Verify program number as ${eVerifyNumber}. ` : ""}Nothing in this offer letter limits rights protected by federal labor, wage, anti-discrimination, immigration, whistleblower, or workplace safety laws.`;
}

export function stateComplianceText(code: string, companyName: string) {
  const name = stateName(code);
  return `${name.toUpperCase()} STATE-SPECIFIC EMPLOYMENT ADDENDUM

Because ${companyName}'s selected home state is ${name}, this offer is administered with ${name} employment-law review in mind. Payroll timing, wage deductions, final pay, expense reimbursement, leave, sick time, meal/rest periods, paid family or medical leave, workers' compensation, unemployment insurance, non-solicitation or restrictive covenant terms, arbitration language, background screening notices, and required employee notices must follow ${name} law where that law applies. If the employee works from another state, the company must also apply any mandatory employment requirements of the employee's work state. If this offer letter conflicts with a mandatory federal, ${name}, or employee-work-state requirement, the mandatory legal requirement controls.`;
}
