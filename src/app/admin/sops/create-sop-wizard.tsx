"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronRight,
  Circle,
  FileText,
  Globe,
  ListChecks,
  Plus,
  Table2,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
};

type StepType = "checklist" | "table";

type SOPStepTable = {
  columns: string[];
  rows: string[][];
};

export type SOPWizardStep = {
  step: number;
  action: string;
  details: string;
  title: string;
  type: StepType;
  instructions: string;
  checklistItems: string[];
  table: SOPStepTable;
};

export type CreateSOPWizardData = {
  name: string;
  eventType: string;
  description: string;
  isGlobal: boolean;
  clientId: string;
  tags: string[];
  steps: SOPWizardStep[];
};

type CreateSOPWizardProps = {
  open: boolean;
  clients: Client[];
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateSOPWizardData) => Promise<void>;
};

const categories = [
  { value: "fall_detection", label: "Fall Detection" },
  { value: "medical_emergency", label: "Medical Emergency" },
  { value: "wandering_risk", label: "Wandering Risk" },
  { value: "device_trigger", label: "Device Trigger" },
  { value: "inactivity_alert", label: "Inactivity Alert" },
  { value: "environmental_alert", label: "Environmental Alert" },
  { value: "general_alert", label: "General Alert" },
];

const stepTypes: Array<{
  value: StepType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { value: "checklist", label: "Checklist", description: "Tick required items", icon: ListChecks },
  { value: "table", label: "Table", description: "Compare or map values", icon: Table2 },
];

const initialStep = (order = 1): SOPWizardStep => ({
  step: order,
  action: "",
  details: "",
  title: "",
  type: "checklist",
  instructions: "",
  checklistItems: [],
  table: {
    columns: ["Condition", "Response"],
    rows: [["", ""]],
  },
});

const initialForm = (): CreateSOPWizardData => ({
  name: "",
  eventType: "",
  description: "",
  isGlobal: true,
  clientId: "",
  tags: [],
  steps: [],
});

function WizardRail({ currentStep }: { currentStep: number }) {
  const items = [
    { title: "SOP Overview", subtitle: "Basic details and scope" },
    { title: "Add Steps", subtitle: "Define the response steps" },
    { title: "Review", subtitle: "Review and finalize" },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-muted/10 px-7 py-8 md:block">
      <div className="space-y-2">
        {items.map((item, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;

          return (
            <div key={item.title} className="relative flex gap-4 pb-12 last:pb-0">
              {index < items.length - 1 && (
                <div className="absolute left-[17px] top-9 h-full w-px bg-border" />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                  isComplete && "border-[var(--rce-green)] bg-[var(--rce-green)] text-white",
                  isActive && "border-[var(--rce-green)] text-[var(--rce-green)] ring-4 ring-[var(--rce-green)]/15",
                  !isActive && !isComplete && "border-border text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <div className="pt-1">
                <div className={cn("font-semibold", isActive && "text-[var(--rce-green)]")}>
                  {item.title}
                </div>
                <div className="mt-1 max-w-32 text-sm leading-6 text-muted-foreground">
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5 border-b border-border/70 p-6 last:border-b-0", className)}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ChoiceCard({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-28 w-full items-start gap-4 rounded-md border bg-background/30 p-4 text-left transition-colors hover:border-foreground/30",
        selected && "border-[var(--rce-green)] bg-[var(--rce-green)]/5"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border",
          selected ? "border-[var(--rce-green)] text-[var(--rce-green)]" : "border-muted-foreground"
        )}
      >
        {selected && <Circle className="h-2.5 w-2.5 fill-current" />}
      </span>
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function CreateSOPWizard({
  open,
  clients,
  submitting,
  onOpenChange,
  onCreate,
}: CreateSOPWizardProps) {
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState<CreateSOPWizardData>(initialForm);
  const [draftStep, setDraftStep] = useState<SOPWizardStep>(initialStep(1));
  const [tagInput, setTagInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");

  const selectedCategoryLabel = useMemo(
    () => categories.find((category) => category.value === formData.eventType)?.label || formData.eventType,
    [formData.eventType]
  );

  const canContinueFromOverview =
    formData.name.trim().length > 0 &&
    formData.eventType.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    (formData.isGlobal || formData.clientId.trim().length > 0);

  const canSaveStep = draftStep.title.trim().length > 0 && draftStep.instructions.trim().length > 0;

  const resetWizard = () => {
    setWizardStep(1);
    setFormData(initialForm());
    setDraftStep(initialStep(1));
    setTagInput("");
    setChecklistInput("");
  };

  const closeWizard = () => {
    if (submitting) return;
    onOpenChange(false);
    resetWizard();
  };

  const updateDraftStep = <K extends keyof SOPWizardStep>(field: K, value: SOPWizardStep[K]) => {
    setDraftStep((step) => ({
      ...step,
      [field]: value,
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || formData.tags.includes(tag)) return;
    setFormData((data) => ({ ...data, tags: [...data.tags, tag] }));
    setTagInput("");
  };

  const saveDraftStep = () => {
    if (!canSaveStep) return;

    const normalizedStep: SOPWizardStep = {
      ...draftStep,
      step: Number(draftStep.step) || formData.steps.length + 1,
      action: draftStep.title.trim(),
      details: draftStep.instructions.trim(),
      title: draftStep.title.trim(),
      instructions: draftStep.instructions.trim(),
      checklistItems: draftStep.checklistItems.filter(Boolean),
      table: {
        columns: draftStep.table.columns.map((column) => column.trim() || "Untitled"),
        rows: draftStep.table.rows.map((row) => row.map((cell) => cell.trim())),
      },
    };

    setFormData((data) => {
      const existingIndex = data.steps.findIndex((step) => step.step === normalizedStep.step);
      const nextSteps =
        existingIndex >= 0
          ? data.steps.map((step, index) => (index === existingIndex ? normalizedStep : step))
          : [...data.steps, normalizedStep];

      return {
        ...data,
        steps: nextSteps
          .sort((a, b) => a.step - b.step)
          .map((step, index) => ({ ...step, step: index + 1 })),
      };
    });

    setDraftStep(initialStep(formData.steps.length + 2));
    setChecklistInput("");
  };

  const editStep = (step: SOPWizardStep) => {
    setDraftStep({
      ...step,
      title: step.title || step.action,
      instructions: step.instructions || step.details,
    });
    setWizardStep(2);
  };

  const removeStep = (stepNumber: number) => {
    setFormData((data) => ({
      ...data,
      steps: data.steps
        .filter((step) => step.step !== stepNumber)
        .map((step, index) => ({ ...step, step: index + 1 })),
    }));
  };

  const addChecklistItem = () => {
    const item = checklistInput.trim();
    if (!item) return;
    updateDraftStep("checklistItems", [...draftStep.checklistItems, item]);
    setChecklistInput("");
  };

  const updateTableColumn = (columnIndex: number, value: string) => {
    updateDraftStep("table", {
      ...draftStep.table,
      columns: draftStep.table.columns.map((column, index) => (index === columnIndex ? value : column)),
    });
  };

  const updateTableCell = (rowIndex: number, columnIndex: number, value: string) => {
    updateDraftStep("table", {
      ...draftStep.table,
      rows: draftStep.table.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell))
          : row
      ),
    });
  };

  const addTableColumn = () => {
    updateDraftStep("table", {
      columns: [...draftStep.table.columns, `Column ${draftStep.table.columns.length + 1}`],
      rows: draftStep.table.rows.map((row) => [...row, ""]),
    });
  };

  const removeTableColumn = (columnIndex: number) => {
    if (draftStep.table.columns.length <= 1) return;
    updateDraftStep("table", {
      columns: draftStep.table.columns.filter((_, index) => index !== columnIndex),
      rows: draftStep.table.rows.map((row) => row.filter((_, index) => index !== columnIndex)),
    });
  };

  const addTableRow = () => {
    updateDraftStep("table", {
      ...draftStep.table,
      rows: [...draftStep.table.rows, draftStep.table.columns.map(() => "")],
    });
  };

  const removeTableRow = (rowIndex: number) => {
    if (draftStep.table.rows.length <= 1) return;
    updateDraftStep("table", {
      ...draftStep.table,
      rows: draftStep.table.rows.filter((_, index) => index !== rowIndex),
    });
  };

  const handleSubmit = async () => {
    if (!canContinueFromOverview || formData.steps.length === 0) return;

    try {
      await onCreate({
        ...formData,
        steps: formData.steps.map((step, index) => ({
          ...step,
          step: index + 1,
          action: step.title || step.action,
          details: step.instructions || step.details,
          sopTags: formData.tags,
        })),
      });
      resetWizard();
    } catch {
      // The parent shows the create error. Keep the wizard state intact.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeWizard();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-6xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <div className="border-b border-border/70 px-8 py-6">
          <DialogTitle className="text-2xl">Create SOP</DialogTitle>
          <DialogDescription className="mt-3 text-base">
            Build a clear, actionable SOP to guide your team through consistent and effective responses.
          </DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1">
          <WizardRail currentStep={wizardStep} />

          <div className="max-h-[68vh] min-h-[560px] flex-1 overflow-y-auto">
            {wizardStep === 1 && (
              <>
                <Section title="Basic Information" description="Give your SOP a clear name and description.">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-name">SOP Name *</Label>
                      <Input
                        id="wizard-name"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        placeholder="e.g., Fall Detection Response"
                      />
                      <HelperText>Choose a clear, specific name.</HelperText>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wizard-category">Category *</Label>
                      <Select
                        value={formData.eventType}
                        onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                      >
                        <SelectTrigger id="wizard-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <HelperText>Choose the type of SOP.</HelperText>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-description">Description *</Label>
                    <Textarea
                      id="wizard-description"
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      placeholder="Describe when and how to use this SOP"
                      rows={5}
                    />
                    <HelperText>Include the purpose and key scenarios this SOP covers.</HelperText>
                  </div>
                </Section>

                <Section title="Scope" description="Define who this SOP applies to.">
                  <div className="grid gap-5 md:grid-cols-2">
                    <ChoiceCard
                      selected={formData.isGlobal}
                      icon={Globe}
                      title="Global (applies to all clients)"
                      description="This SOP will be available for all clients and situations."
                      onClick={() => setFormData({ ...formData, isGlobal: true, clientId: "" })}
                    />
                    <ChoiceCard
                      selected={!formData.isGlobal}
                      icon={User}
                      title="Client-specific"
                      description="This SOP will be created for a specific client."
                      onClick={() => setFormData({ ...formData, isGlobal: false })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-client">
                      Applicable to <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Select
                      value={formData.clientId || "all"}
                      disabled={formData.isGlobal}
                      onValueChange={(value) =>
                        setFormData({ ...formData, clientId: value === "all" ? "" : value, isGlobal: value === "all" })
                      }
                    >
                      <SelectTrigger id="wizard-client">
                        <SelectValue placeholder="Select clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <HelperText>Leave blank to apply to all clients.</HelperText>
                  </div>
                </Section>

                <Section title="Tags" description="Add tags to help categorize and find this SOP easily.">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-tags">Tags <span className="text-muted-foreground">(optional)</span></Label>
                    <div className="flex gap-2">
                      <Input
                        id="wizard-tags"
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="e.g., fall, intrusion, medical"
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    <HelperText>Press Enter to add a tag.</HelperText>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-2">
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((data) => ({
                                  ...data,
                                  tags: data.tags.filter((currentTag) => currentTag !== tag),
                                }))
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>
              </>
            )}

            {wizardStep === 2 && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold">Add Step</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Break down the response process into clear, actionable steps.
                  </p>
                </div>

                <div className="rounded-md border border-border/70 p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold">Step Details</h4>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="step-title">Step Title *</Label>
                      <Input
                        id="step-title"
                        value={draftStep.title}
                        onChange={(event) => updateDraftStep("title", event.target.value)}
                        placeholder="e.g., Immediate Contact"
                      />
                      <HelperText>A short, clear title for this step.</HelperText>
                    </div>

                    <div className="space-y-3">
                      <Label>Step Type</Label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {stepTypes.map((type) => {
                          const Icon = type.icon;
                          const selected = draftStep.type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => updateDraftStep("type", type.value)}
                              className={cn(
                                "rounded-md border p-4 text-left transition-colors hover:border-foreground/30",
                                selected && "border-[var(--rce-green)] bg-[var(--rce-green)]/5"
                              )}
                            >
                              <div className="flex items-center gap-2 font-semibold">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">{type.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="step-order">Step Order</Label>
                      <Input
                        id="step-order"
                        type="number"
                        min={1}
                        value={draftStep.step}
                        onChange={(event) => updateDraftStep("step", Number(event.target.value))}
                        className="max-w-40"
                      />
                      <HelperText>Steps are performed in this order.</HelperText>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="step-instructions">Description / Instructions *</Label>
                      <Textarea
                        id="step-instructions"
                        value={draftStep.instructions}
                        onChange={(event) => updateDraftStep("instructions", event.target.value)}
                        placeholder="Describe what needs to be done in this step..."
                        rows={5}
                      />
                      <HelperText>Provide clear, detailed instructions for your team.</HelperText>
                    </div>

                    {draftStep.type === "checklist" && (
                      <div className="rounded-md border border-border/70 p-4">
                        <h4 className="font-semibold">
                          Checklist Items <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                        </h4>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Add the items staff must confirm before this step is complete.
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Input
                            value={checklistInput}
                            onChange={(event) => setChecklistInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addChecklistItem();
                              }
                            }}
                            placeholder="e.g., Client confirms they are not injured"
                          />
                          <Button type="button" variant="outline" onClick={addChecklistItem}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </Button>
                        </div>
                        {draftStep.checklistItems.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {draftStep.checklistItems.map((item) => (
                              <div key={item} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDraftStep(
                                      "checklistItems",
                                      draftStep.checklistItems.filter((currentItem) => currentItem !== item)
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {draftStep.type === "table" && (
                      <div className="rounded-md border border-border/70 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="font-semibold">Table Content</h4>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Use tables for escalation matrices, contact lists, thresholds, or condition-to-response mappings.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={addTableColumn}>
                              <Plus className="mr-2 h-4 w-4" />
                              Column
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={addTableRow}>
                              <Plus className="mr-2 h-4 w-4" />
                              Row
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                              <tr>
                                {draftStep.table.columns.map((column, columnIndex) => (
                                  <th key={columnIndex} className="border border-border/70 bg-muted/30 p-2 text-left">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={column}
                                        onChange={(event) => updateTableColumn(columnIndex, event.target.value)}
                                        className="h-8"
                                        placeholder={`Column ${columnIndex + 1}`}
                                      />
                                      {draftStep.table.columns.length > 1 && (
                                        <button type="button" onClick={() => removeTableColumn(columnIndex)}>
                                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                      )}
                                    </div>
                                  </th>
                                ))}
                                <th className="w-10 border border-border/70 bg-muted/30 p-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {draftStep.table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, columnIndex) => (
                                    <td key={columnIndex} className="border border-border/70 p-2 align-top">
                                      <Textarea
                                        value={cell}
                                        onChange={(event) => updateTableCell(rowIndex, columnIndex, event.target.value)}
                                        rows={2}
                                        placeholder="Cell value"
                                      />
                                    </td>
                                  ))}
                                  <td className="border border-border/70 p-2 text-center align-middle">
                                    {draftStep.table.rows.length > 1 && (
                                      <button type="button" onClick={() => removeTableRow(rowIndex)}>
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button type="button" onClick={saveDraftStep} disabled={!canSaveStep}>
                        Save Step
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.steps.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-semibold">Saved Steps</h4>
                    {formData.steps.map((step) => (
                      <div key={step.step} className="flex items-center justify-between rounded-md border border-border/70 p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline">Step {step.step}</Badge>
                          <div>
                            <div className="font-semibold">{step.title || step.action}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {step.type} · {step.instructions || step.details}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => editStep(step)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(step.step)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-6 p-6">
                <div>
                  <h3 className="text-2xl font-semibold">Review SOP</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Confirm the SOP details before saving it for your team.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-md border border-border/70 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Name
                    </div>
                    <div className="mt-3 font-semibold">{formData.name}</div>
                  </div>
                  <div className="rounded-md border border-border/70 p-4">
                    <div className="text-sm text-muted-foreground">Category</div>
                    <div className="mt-3 font-semibold">{selectedCategoryLabel}</div>
                  </div>
                  <div className="rounded-md border border-border/70 p-4">
                    <div className="text-sm text-muted-foreground">Scope</div>
                    <div className="mt-3 font-semibold">
                      {formData.isGlobal
                        ? "Global"
                        : clients.find((client) => client.id === formData.clientId)?.name || "Client-specific"}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border/70 p-5">
                  <h4 className="font-semibold">Description</h4>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{formData.description}</p>
                </div>

                {formData.tags.length > 0 && (
                  <div className="rounded-md border border-border/70 p-5">
                    <h4 className="font-semibold">Tags</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-border/70 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Response Steps</h4>
                    <Badge variant={formData.steps.length > 0 ? "default" : "destructive"}>
                      {formData.steps.length} step{formData.steps.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {formData.steps.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Add at least one response step before creating this SOP.
                      </div>
                    ) : (
                      formData.steps.map((step) => (
                        <div key={step.step} className="rounded-md bg-muted/30 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Step {step.step}</Badge>
                                <Badge variant="secondary">{step.type}</Badge>
                              </div>
                              <div className="mt-3 font-semibold">{step.title || step.action}</div>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {step.instructions || step.details}
                              </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => editStep(step)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {canContinueFromOverview && formData.steps.length > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-[var(--rce-green)]/40 bg-[var(--rce-green)]/5 p-4 text-sm">
                    <CheckCircle className="h-4 w-4 text-[var(--rce-green)]" />
                    This SOP is ready to create.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 px-8 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => (wizardStep === 1 ? closeWizard() : setWizardStep(wizardStep - 1))}
            disabled={submitting}
          >
            {wizardStep === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex gap-3">
            {wizardStep > 1 && (
              <Button type="button" variant="outline" onClick={closeWizard} disabled={submitting}>
                Cancel
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button
                type="button"
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={wizardStep === 1 ? !canContinueFromOverview : formData.steps.length === 0}
              >
                {wizardStep === 1 ? "Next: Add Steps" : "Next: Review"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting || !canContinueFromOverview || formData.steps.length === 0}>
                {submitting ? "Creating..." : "Create SOP"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
