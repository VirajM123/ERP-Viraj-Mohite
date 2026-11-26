import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SearchablePartySelect.css";

const optionText = (children) => React.Children.toArray(children).map((child) =>
  typeof child === "string" || typeof child === "number" ? String(child) :
    React.isValidElement(child) ? optionText(child.props.children) : ""
).join("").replace(/\s+/g, " ").trim();

export default function SearchablePartySelect({ children, value = "", onChange, className = "", placeholder, disabled, name, id, required, showOptionDetails = false, ...inputProps }) {
  const options = useMemo(() => React.Children.toArray(children).flatMap((child) =>
    Array.isArray(child) ? child : React.isValidElement(child) && child.type === "option" ? [child] : []
  ).map((option) => ({ value: String(option.props.value ?? ""), label: optionText(option.props.children), detail: option.props["data-detail"] || "", disabled: option.props.disabled, style: option.props.style })), [children]);
  const selected = options.find((option) => option.value === String(value ?? ""));
  const emptyOption = options.find((option) => option.value === "");
  const [query, setQuery] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) setQuery(selected?.value ? selected.label : "");
  }, [value, selected?.label, open]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const matches = options.filter((option) => option.value && !option.disabled && (!filtering || `${option.label} ${showOptionDetails ? `${option.value} ${option.detail}` : ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const choose = (option) => {
    setQuery(option.label);
    setFiltering(false);
    setOpen(false);
    onChange?.({ target: { name, value: option.value }, currentTarget: { name, value: option.value } });
  };
  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setActive(0); return; }
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % (matches.length || 1));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setFiltering(false);
      setQuery(selected?.value ? selected.label : "");
    }
  };

  useEffect(() => {
    if (open && wasOpen.current) listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    wasOpen.current = open;
  }, [active, open]);

  return <div className="searchable-party-select" ref={rootRef}>
    {name && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}
    <input
      {...inputProps}
      id={id}
      className={className}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={open ? `${id || name || "party"}-options` : undefined}
      autoComplete="off"
      disabled={disabled}
      required={required}
      pattern={required && !value ? "(?!)" : undefined}
      placeholder={placeholder || emptyOption?.label || "Search party"}
      value={query}
      onFocus={(event) => { setFiltering(false); setOpen(true); setActive(0); event.target.select(); }}
      onChange={(event) => {
        setQuery(event.target.value);
        setFiltering(true);
        setOpen(true);
        setActive(0);
        if (value) onChange?.({ target: { name, value: "" }, currentTarget: { name, value: "" } });
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        window.setTimeout(() => {
          if (!rootRef.current?.contains(document.activeElement)) {
            setOpen(false);
            setQuery(selected?.value ? selected.label : "");
          }
        }, 0);
      }}
    />
    {open && <div id={`${id || name || "party"}-options`} className="searchable-party-options" role="listbox" ref={listRef}>
      {matches.length ? matches.map((option, index) => <button
        type="button"
        role="option"
        aria-selected={index === active}
        className={index === active ? "active" : ""}
        key={`${option.value}-${index}`}
        style={option.style}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(option)}
      ><span>{option.label}</span>{showOptionDetails && option.detail && <small className="searchable-party-option-detail">{option.detail}</small>}</button>) : <div className="searchable-party-empty">No matching parties</div>}
    </div>}
  </div>;
}
