import { useState, type ReactNode } from "react";
import { Input } from "../ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { JsonProperty, StringProperty } from "./types";
import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";

export const AutoField = ({
  jsonProperty,
}: {
  jsonProperty: JsonProperty | _JSONSchema;
}): ReactNode => {
  if (typeof jsonProperty !== "object" || jsonProperty === null) {
    return <span>Invalid property schema: {JSON.stringify(jsonProperty)}</span>;
  }

  if ("anyOf" in jsonProperty && jsonProperty.anyOf) {
    return <AnyOfTabs options={jsonProperty.anyOf} />;
  }

  if (!("type" in jsonProperty))
    return <span>No type found: {JSON.stringify(jsonProperty)}</span>;

  const type = jsonProperty.type;
  const format = Object.prototype.hasOwnProperty.call(jsonProperty, "format")
    ? (jsonProperty as Partial<{ format: string }>).format
    : undefined;

  if ("enum" in jsonProperty && jsonProperty.enum) {
    return (
      <Select>
        <SelectTrigger>Select value...</SelectTrigger>
        <SelectContent>
          {jsonProperty.enum.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  switch (type) {
    case "array": {
      // jsonSchema items can be: true | _JSONSchema | _JSONSchema[]
      // TODO: make it a single field for now, add support for multiple items later
      const items = jsonProperty.items;

      if (!items) {
        return <></>;
      }

      // Tuple-style items (array) - pick the first item for now
      if (Array.isArray(items)) {
        return <AutoField jsonProperty={items[0] as JsonProperty} />;
      }

      // items === true means any type allowed; render a generic input
      if (items === true) {
        return <Input type="text" />;
      }

      // single schema
      return <AutoField jsonProperty={items as JsonProperty} />;
    }

    case "object":
      // If explicit properties exist, render them
      if (
        jsonProperty.properties &&
        Object.keys(jsonProperty.properties).length > 0
      ) {
        return (
          <ul className="border p-2">
            {Object.entries(jsonProperty.properties).map(([key, value]) => (
              <li key={key}>
                <h3 className="italic">{key}:</h3>{" "}
                <AutoField jsonProperty={value} />
              </li>
            ))}
          </ul>
        );
      }

      // Handle record-like objects using additionalProperties/propertyNames
      if ("additionalProperties" in jsonProperty) {
        const additionalProperties = jsonProperty.additionalProperties;
        const propertyNames = jsonProperty.propertyNames as
          | Partial<StringProperty>
          | undefined;

        if (additionalProperties === false) {
          return <span>No additional properties allowed</span>;
        }

        // Simple key/value row. Key respects propertyNames.pattern when available.
        return (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="key"
              // If a pattern is specified for property names, pass it to the input
              pattern={propertyNames?.pattern}
              title={
                propertyNames?.pattern
                  ? `Pattern: ${propertyNames.pattern}`
                  : undefined
              }
            />
            {additionalProperties === true ? (
              <Input type="text" placeholder="value" />
            ) : (
              // ap is a JsonProperty schema describing the value type
              <AutoField jsonProperty={additionalProperties as JsonProperty} />
            )}
          </div>
        );
      }

      // Fallback empty object
      return <span className="italic">{`{ }`}</span>;

    case "string":
      switch (format) {
        case "email":
          return <Input type="email" />;

        case "uri":
          return <Input type="url" />;

        case "date-time":
          return (
            <>
              <DatePicker />
              <Input type="time" step={1} />
            </>
          );

        case "date":
          return <DatePicker />;

        case "time":
          return <Input type="time" step={1} />;

        default:
          return <Input type="text" />;
      }

    case "number":
    case "integer":
      return <Input type="number" />;

    case "boolean":
      return <Input type="checkbox" />;

    case "null":
      return <span className="font-mono">null</span>;

    default:
      return (
        <span>Unsupported field type: {JSON.stringify(jsonProperty)}</span>
      );
  }
};

function AnyOfTabs({
  options,
}: {
  options: Array<JsonProperty | _JSONSchema>;
}) {
  const [active, setActive] = useState("0");

  const getLabel = (opt: unknown, idx: number): string => {
    if (
      opt &&
      typeof opt === "object" &&
      "title" in (opt as Record<string, unknown>)
    ) {
      const t = (opt as { title?: unknown }).title;
      if (typeof t === "string" && t.trim().length > 0) return t;
    }
    if (
      opt &&
      typeof opt === "object" &&
      "type" in (opt as Record<string, unknown>)
    ) {
      const tp = (opt as { type?: unknown }).type;
      if (typeof tp === "string" && tp) return tp;
    }
    return `Option ${idx + 1}`;
  };

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        {options.map((opt, i) => (
          <TabsTrigger key={i} value={String(i)}>
            {getLabel(opt, i)}
          </TabsTrigger>
        ))}
      </TabsList>
      {options.map((opt, i) => (
        <TabsContent key={i} value={String(i)}>
          <AutoField jsonProperty={opt} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
