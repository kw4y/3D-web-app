// About app 

import { createWindow } from "../window.js";

let openInstance = null;

const CONTENT = `
<div class="ab-app">
<article class="ab-doc">

  <header class="ab-doc__head">
    <h1 class="ab-doc__title">About</h1>
    <p  class="ab-doc__meta">Notes</p>
  </header>

  <p>
    I made this project for my 3D Web Apps assignment. My goal was to design
    a website that feels more like a real desktop than a typical webpage.
    Rather than just putting a 3D model in the center of a single-page
    portfolio, I wanted the site to be interactive and explorable, almost
    like opening a mini operating system in your browser.
  </p>
  <p>
    The interface takes a lot of inspiration from macOS, especially its
    desktop layout and window system. There's a dock at the bottom of the
    screen where you can launch apps, and each one opens in its own
    draggable window. The home screen wallpaper is an actual Three.js scene
    with a grass field and my character standing in it.
  </p>

  <h2>3D Models</h2>
  <p>
    I created three models for this project: the character on the wallpaper,
    a green apple, and a pair of headphones. Each model covers a different
    part of the modeling brief, so you can see geometry, materials, lighting,
    and camera work across all of them.
  </p>
  <p>
    The character is the main focus and is a reimagining of the main
    character from the movie <em>All About Lily Chou Chou</em>, head down
    and mostly hidden by the grass. I used Rigify and applied the pose as
    the rest pose so the standing position exports cleanly. The shoes have
    minimal texture because I ran out of time and they were always meant to
    be hidden anyway.
  </p>
  <p>
    The second model, the green apple, is again a call back to <em>All About
    Lily Chou-Chou</em>; it plays a very integral role within the movie. I
    started with a single Cycles material and added a paint slot for the
    handwritten "blue-cat@japan.com" inscription. Then I baked it to flat
    PBR textures for glTF compatibility.
  </p>
  <p>
    The headphones are based on the Sony MDR-G72, again inspired by the
    movie as the headphones of the main character. Textured the model with
    PBR materials: brushed aluminium for the cups, matte black for the
    headband and cable, chrome for the jack tip, and speaker grille cloth.
  </p>
  <p>
    I kept the geometry efficient across all models, with a combined poly
    count under 30,000. Where I used subdivision modifiers, I baked them at
    low levels. I avoided aggressive decimation to keep the topology clean
    and easy to edit.
  </p>
  <p>
    All materials and textures use PBR. I used image textures where they
    matter, like the apple's handwritten inscription, which I baked from a
    Cycles graph. For things like the headphones' chrome jack, I used flat
    color values. All textures are embedded in the glTF files, so there are
    no external image dependencies or broken paths in production.
  </p>
  <p>
    The wallpaper uses two lights: a soft ambient hemisphere light for fill
    and a directional sunlight for shadows and edge definition, despite not
    working too well as the grass model was modelled long before I knew
    anything about Blender. The Models app has its own lighting setup, a
    three-point rig in Showcase mode and a flatter, ambient-only setup in
    Blender mode to match Blender's default viewport look.
  </p>
  <p>
    The camera setup changes depending on the view. The wallpaper uses a
    perspective camera with a moderate field of view. In the Models app,
    you can switch between a Blender-style perspective camera with free
    orbit and zoom controls, or a Showcase camera that auto-rotates the
    model on a turntable. Both use Three.js <code>PerspectiveCamera</code>,
    so the toggle covers the main use cases.
  </p>
  <p>
    The pipeline for all three models is the same: I made them in Blender,
    exported them as glTF Binary (.glb), and loaded them into Three.js with
    <code>GLTFLoader</code>. I chose glTF because it's a single file with
    embedded textures, loads quickly, and each model is about 1MB.
  </p>

  <h2>Design Choices</h2>
  <p>
    Two main influences shaped the look of the project. The macOS desktop
    inspired the structure because I wanted the site to feel like a place
    with different rooms, not just a single page. And, the
    <em>Lily Chou-Chou</em> influence is personal, as it is my favourite
    film. It's a sad, grounded, and ethereal movie with beautiful colours
    and an amazing soundtrack.
  </p>
  <p>
    The character standing alone in the field is partly inspired by the
    film and partly represents me. I chose the pose based on one of the
    movie's main scenes, with most of the character hidden behind the grass.
  </p>
  <p>
    The Models app is a Blender mock-up; choosing to do this as a model
    viewer fits the theme of an operating system in the browser, compared
    to a more static model viewer. The Safari app was the same kind of
    thinking, to create the feel that the user is navigating through an
    operating system with very simple animations but it drives it home.
  </p>

  <h2>Technology</h2>
  <p>
    I used plain HTML, CSS, and JavaScript for the project, with Three.js
    handling the 3D parts. There's no framework or build step. The
    browser is the only compiler needed.
  </p>
  <p>
    Three.js provides direct access to WebGL, which was important for the
    post-processing effects on the wallpaper, but they didn't work as
    expected. X3DOM is good for declarative inline 3D in HTML, but it's
    harder to use for procedural effects. Three.js also has a much bigger
    ecosystem. Tools like <code>GLTFLoader</code>, <code>EffectComposer</code>,
    <code>UnrealBloomPass</code>, and <code>OrbitControls</code> were all
    helpful right away, and the documentation for Three.js made it easier
    to pick up and apply.
  </p>
  <p>
    The project is small, so a framework would have added unnecessary
    complexity. The whole app loads from a single HTML file with no
    compilation step, so it works on the ITS server without any special
    hosting setup. The dock-as-app-registry pattern is a simple custom
    setup that can be implemented in about 30 lines of <code>dock.js</code>.
  </p>
  <p>
    I used glTF for the 3D models as it's the standard format for web 3D,
    supports embedded textures, loads asynchronously, and Three.js supports
    it directly with <code>GLTFLoader</code>. Each model exports as a single
    binary file with everything inside, so there are no missing textures
    or path issues.
  </p>
  <p>
    Why case-sensitive paths everywhere? The ITS server runs Linux. Windows
    ignores case, Linux doesn't. <code>assets/Models/</code> (capital M) is
    treated as different from <code>assets/models/</code> on the live
    server. I had this break once during early testing and learned my
    lesson.
  </p>

  <h2>Deeper Understanding</h2>
  <p>
    The Safari app employs iframe-based content swapping, allowing three
    different documents to be displayed within the same window via
    JavaScript without requiring a page reload. The standalone pages
    (submission, sitemap, references) are actual HTML files located at the
    site root, enabling them to function independently of the desktop
    environment if accessed directly. This approach maintains a single
    source of truth with two distinct access points.
  </p>

  <h2>Accessibility</h2>
  <p>
    I tried to keep the underlying HTML sensible even though the interface is
    unusual. The page sets a <code>lang</code> attribute, images carry
    <code>alt</code> text, and the interactive controls have ARIA labels: each
    window is a labelled <code>dialog</code>, the traffic-light buttons say what
    they do, and the dock icons name their app. There's also a
    <code>prefers-reduced-motion</code> rule, so the animations back off for
    anyone who has reduced motion turned on. The most useful part is probably
    that the submission, sitemap, and references pages are real HTML files at the
    site root, so all the written content can be read directly, by a screen
    reader or if the desktop layer fails to load, without touching the Three.js
    scene at all.
  </p>
  <p>
    That said, the desktop metaphor has real limits I'm aware of. Dragging
    windows and orbiting the models are mouse-driven, so they aren't operable by
    keyboard, and the 3D scenes have no text alternative, which means a screen
    reader can't describe the wallpaper or the models in any meaningful way. I
    didn't add a skip link or properly audit the colour contrast of the cooler
    palette either. Making a faux operating system fully keyboard and
    screen-reader navigable would be most of a project on its own, so I treated
    graceful fallback to the plain HTML pages as the realistic goal for the time
    I had.
  </p>

  <h2>Testing</h2>
  <p>
    I ran out of time before I could get any external eyes on the project.
    The only testing I did was cross-browser testing on the devices I
    already had access to.
  </p>
  <p>
    Testing strategy: the live build was loaded on three browser/device
    combinations to catch anything that broke cross-platform: Chrome
    and Firefox on Windows, Safari on macOS. I worked through each app in
    the dock: opened and closed windows, dragged them around the desktop,
    swapped models in the Models app between the four shading modes, and
    clicked through the Safari tabs to confirm iframe swapping worked.
  </p>
  <p>
    A key limitation is that cross-browser testing does not substitute for
    comprehensive user testing. Without external testers, I lack insight
    into whether the desktop metaphor is perceived as interactive by
    first-time visitors, whether the dock icons are intuitive without
    labels, or if any aspects of the interface are confusing in ways I may
    not recognize as the creator. The assignment rubric emphasizes
    feedback-plus-impact statements, which I am unable to provide. This
    represents the most significant gap in my submission.
  </p>

</article>
</div>
`;

export function open(buttonEl) {
  if (openInstance && document.body.contains(openInstance.el)) {
    openInstance.close();
    openInstance = null;
    return;
  }

  const win = createWindow({ title: "About", content: CONTENT });

  const r = buttonEl.getBoundingClientRect();
  win.openFrom(r.left + r.width / 2, r.top + r.height / 2);

  win.el.querySelector(".win__light--close").addEventListener("click", () => {
    openInstance = null;
  });

  openInstance = win;
}