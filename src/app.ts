interface Draggable { 
  dragStartHander(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget { 
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;

}

enum ProjectStatus {
  ACTIVE,
  FINISHED,
}
class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

type Listner<T> = (items: T[]) => void;

class State<T> {
  private _listners: Listner<T>[] = [];
  addListener(listenerFn: Listner<T>) {
    this._listners.push(listenerFn);
  }

  get listners() {
    return this._listners;
  }
}

class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;
  private constructor() {
    super();
  }
  public static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addProject(title: string, description: string, numOfPeople: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      numOfPeople,
      ProjectStatus.ACTIVE
    );
    this.projects.push(newProject);

    for (const listenerFn of super.listners) {
      listenerFn(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

interface Validatable {
  value: string | number;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length > 0;
  }

  if (validatableInput.minLength != null) {
    isValid =
      isValid &&
      validatableInput.value.toString().length >= validatableInput.minLength;
  }

  if (validatableInput.maxLength != null) {
    isValid =
      isValid &&
      validatableInput.value.toString().length <= validatableInput.maxLength;
  }

  if (validatableInput.min != null) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }

  if (validatableInput.max != null) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }
  return isValid;
}

function autobind(
  _target: any,
  _methodName: string,
  desciptor: PropertyDescriptor
) {
  const originalMethod = desciptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };
  return adjDescriptor;
}

// base component
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    elementId: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId)! as T;

    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );
    this.element = importedNode.firstElementChild as U;
    this.element.id = elementId;
    this.attach(insertAtStart);
  }

  attach(insertAtStart: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtStart ? "afterbegin" : "beforeend",
      this.element
    );
  }
  abstract configure(): void;
  abstract renderContent(): void;
}

class ProjectsList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[] = [];
  constructor(private type: "active" | "finished") {
    super("project-list", "app", false, `${type}-projects`);

    projectState.addListener((projects: any[]) => {
      this.assignedProjects = projects.filter((prj) => {
        if (this.type === "active") {
          return prj.status === ProjectStatus.ACTIVE;
        }
        return prj.status === ProjectStatus.FINISHED;
      });
      this.renderProjects();
    });
    this.renderContent();
  }
  renderContent() {
    const listid = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listid;
    this.element.querySelector(
      "h2"
    )!.textContent = `${this.type.toUpperCase()} PROJECTS`;
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.type}-projects-list`
    ) as HTMLUListElement;
    listEl.innerHTML = "";
    for (const prjItem of this.assignedProjects) {
      // const listItem = document.createElement("li");
      // listItem.textContent = prjItem.title;
      // listEl.appendChild(listItem);

      new ProjectItem(this.element.querySelector("ul")!.id, prjItem);
    }
  }

  configure(): void {}
}

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
  private project: Project;

  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);
    this.project = project;
    this.renderContent();
  }
  get title() {
    return this.project.title;
  }
  get people() {
    if (this.project.people == 1) { 
      return this.project.people + " person joined";
    }
    return this.project.people + " people joined";
  }
  get desc() {
    return this.project.description;
  }
  renderContent() {
    this.element.querySelector("h2")!.textContent = this.title;
    this.element.querySelector("h3")!.textContent = this.people;
    this.element.querySelector("p")!.textContent = this.desc;
  }

  configure(): void {
    throw new Error("Method not implemented.");
  }

  @autobind
  dragStartHander(event: DragEvent): void {
    console.log('Drag Start', event);
  }
  dragEndHandler(event: DragEvent): void {
    console.log('Drag End', event)
  }
  
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleElement: HTMLInputElement;
  descElement: HTMLInputElement;
  peopleElement: HTMLInputElement;
  constructor() {
    super("project-input", "app", false, "user-input");

    this.titleElement = this.element.querySelector(
      "#title"
    ) as HTMLInputElement;
    this.descElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;
    this.peopleElement = this.element.querySelector(
      "#people"
    ) as HTMLInputElement;
    this.configure();
  }

  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleElement.value;
    const enteredDesc = this.descElement.value;
    const enteredPeople = +this.peopleElement.value;
    const titleValidatable = {
      value: enteredTitle,
      required: true,
      minLength: 3,
    };

    const descValidatable = {
      value: enteredDesc,
      required: true,
      minLength: 3,
    };

    const peopleValidatable = {
      value: enteredPeople,
      required: true,
      min: 3,
      max: 10,
    };
    if (
      !validate(titleValidatable) ||
      !validate(descValidatable) ||
      !validate(peopleValidatable)
    ) {
      alert("Invalid Data Entered");
      return;
    }

    return [enteredTitle, enteredDesc, +enteredPeople];
  }
  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const enteredValues = this.gatherUserInput();
    console.log(enteredValues);
    if (Array.isArray(enteredValues)) {
      const [title, desc, people] = enteredValues;
      projectState.addProject(title, desc, people);
    }
    this.clearForm();
  }

  private clearForm() {
    this.titleElement.value = "";
    this.descElement.value = "";
    this.peopleElement.value = "";
  }

  configure() {
    // this.element.addEventListener("submit", this.submitHandler.bind(this));
    this.element.addEventListener("submit", this.submitHandler);
  }
  renderContent(): void {}
}

const prjInput = new ProjectInput();
const actProjectLists = new ProjectsList("active");
const finishedProjectLists = new ProjectsList("finished");
