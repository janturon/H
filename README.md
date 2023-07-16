# General reactivity framework proposal
Having not yet any direct native way to implement reactivity (i.e. to code model-view data binding in a declarative way) we need a concept to implement it within current browser API. Such concept should NOT be code implementation (as there are many ways to do it), but rather verbal description, clearly defining the approach and intentions of the development.

Part of this repo is a concept of implementation - [H framework](H.md). It is not meant as ready-to-use collective work, but rather as inspiration that rules mentioned below are achievable. The rules are clear and the concept is not complex. Keeping the complexity minimal is paramount, so make your own implementation adjusted to your needs to avoid needless generalization. This framework is verbal desription and nothing else. The code size is and allways will be 0 bytes.

## General requirements

1. The binding must be expressed in pure HTML, otherwise it contradicts the declarative aspect.
2. It must not use any transpiler. The purpose of the framework is *how to implement reactivity within the current syntax*, not *which syntax describes the reactivity best*.
3. It must use only valid HTML5 code for the very same reasons.
4. The uncompressed code implementation must be shorter than this description.
5. Any external dependency adds its size to the uncompressed code implementation limit.
6. It should focus on reactivity only. Other functionality has to be clearly separated from the reactivity framework. Monolithic architecture is undesirable.

## Data models
The requirements for data models implementation are:

1. The data model is specified in `data-model` attribute.
2. If the `data-model` is not specified, it is taken from the closest parent element that has it specified.
3. Data model scopes may interleave, but each element has at most one data model (the closest).
4. If the data-model is not found, there is no data binding and no error must be produced.
5. The data model can be partial, specifying only a property of the parent model.
6. The data models are auto-bound event to the elements at DOMContentLoaded or script load and updated by MutationObserver that watches for `data-model` attribute changes.

### Example
In the snippet below, the models of the `span`s are **Users[0]** resp. **Users[1]**, while the model for the `b` and `i` is **Translations**:
```
<div data-model="Users">
  <span data-model="[0]"></span>
  <b data-model="Translations">
    <i></i>
  </b>
  <span data-model="[1]"></span>
</div>
```

## Attribute binding
The requirements for attribute binding are:

1. The binding attributes are in `data-bind-X` name format, where `X` is the attribute to change.
2. The value of the binding attribute is evaluated for each model change with the respective data model as the context.
3. If the bound attribute is boolean, it is added when the evaluated expression is truthy and removed if falsy.
4. If the bound attribute is not boolean, it is set to the value of evaluated expression.
5. If the bound attribute is `value` the value change on input event changes the respective data model back.
6. If the bound attribute is `html`, the `innerHTML` property is updated as a template using native JS string template syntax.

### Example
```
<script>
User = dataModel({
  name: "John",
  age: 16
});
</script>

<div data-model="User">
    <span data-bind-html>${this.name}:</span>
    <input type="number" data-bind-value="this.age">
    <input type="submit" data-bind-disabled="this.age<18" value="Submit">
</div>
```

When the data model is bound, the output must be at least this (additional attributes and properties may be created):
```
<div data-model="User">
    <span data-bind-html>John:</span>
    <input type="number" data-bind-value="this.age" value="16">
    <input type="submit" data-bind-disabled="this.age<18" value="Submit" disabled>
</div>
```
The `User.age` is updated on input event and when it is set to 18+, the button's disabled attribute is removed.

## Reactivity
Reactivity binds JS data model provided as JS object to HTML view in a declarative way. The requirements for reactivity are:

1. Each time the model data are changed, the change propagates to all elements with relevant `data-model` attribute (including those dynamically created later). The model data change is implemented Proxy object(s).
2. Each time the model is replaced for another model, the change also propagates. The model replacement is implemented as MutationObserver(s).

### Example
The Proxy implementation of the model data change above could look like this

```
<script>
User = {
  name: "John",
  age: 42
};
UserModel = dataModel(User);
</script>

<div data-model="UserModel" data-bind-html>
  ${this.name} is ${this.age} years old.
</div>
<button onclick="UserModel.age++">Next year</button>
```
When the data model is bound, the text content should be *John is 42 years old* and each click on the button updates the text to *... 43 years old*, *... 44 years old* and so forth.

## Array attribute
If the bound attribute is `array`:

1. The initial element's innerHTML must have exactly one element child (with optional descendants); the initial innerHTML is stored as a template.
2. The template is cloned for each item in the data model, and the `data-model` of the item is set to `[index]`.
3. If the data model adds or remove items, the item elements must be also added or removed.
4. The elements properties and event listeners must be kept if the item element is not removed by the data model change.
5. The order of the item elements must match the order in the data model.
6. The data models of each generated item must be independent to others.

### Example
```
<script>
  Users = dataProxy([
    {name: "John"},
    {name: "Jill"},
    {name: "Jake"}
  ]);
</script>

<ul data-model="Users" data-bind-array>
    <li data-bind-html>${this.name}
</ul>
```
When the data model is bound, the output must be at least

```
<ul data-model="Users" data-bind-array>
    <li data-model="[0]" data-bind-html>John
    <li data-model="[1]" data-bind-html>Jill
    <li data-model="[2]" data-bind-html>Jake
</ul>
```

Now if we add event listener
```
<script>
let JohnSelector = "[data-model='Users'] > [data-model='[0]']";
document.querySelector(JohnSelector)?.addEventListener(e =>
    alert(e.target.innerHTML)
);
</script>
```

Then if we call `Users.splice(1, 1)`, the *Jill* must be removed and the click handler for *John* must still fire. The HTML output should change to
```
<ul data-model="Users" data-bind-array>
    <li data-model="[0]" data-bind-html>John
    <li data-model="[1]" data-bind-html>Jake
</ul>
```

## Suggestions
The implementation can provide:
1. Any data or API to examine the elements - models data binding.
2. Any tools to monitor or debug unsuccessful data binding.
3. Any configuration or integration.

## Breaking changes
1. As soon as any feature gets native solution fully supported by 95 % of the latest version of modern browsers, the feature MUST BE removed from the framework and delegated to the native solution. Therefore, in time, the size of the framework code should reduce to zero, beeing moved to lower level (the iterpret's compiled libraries). Anything that remains on the JS framework level for too long is garbage.

## Licensing
1. The implementation must have any open-source license.
2. Avoid no-responsibility disclaimer. There must be some guarantees to make any reliable economic model.
