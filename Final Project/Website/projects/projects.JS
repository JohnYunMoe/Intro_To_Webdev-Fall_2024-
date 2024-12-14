gsap.registerPlugin(ScrollTrigger);

gsap.set('.projects_scrollable', {autoAlpha:1});

let iteration = 0; // gets iterated when we scroll all the way to the end or start and wraps around - allows us to smoothly continue the playhead scrubbing in the correct direction.

// set initial state of items
gsap.set('.projects_list li', {yPercent: 400, opacity: 0, scale: 0});

const spacing = 0.07; // spacing of the projects_list (stagger)
const snapTime = gsap.utils.snap(spacing); // we'll use this to snapTime the playhead on the simpleloop
const projects_list = gsap.utils.toArray('.projects_list li');

// this function will get called for each element in the buildsimpleloop() function, and we just need to return an animation that'll get inserted into a master timeline, spaced
const animateFunc = element => {
	const tl = gsap.timeline();
	tl.fromTo(element, {scale: 0, opacity: 0}, {scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: "power1.in", immediateRender: false})
	  .fromTo(element, {yPercent: 600}, {yPercent: -600, duration: 1, ease: "none", immediateRender: false}, 0);
	return tl;
};
const simpleloop = buildsimpleloop(projects_list, spacing, animateFunc);
const playhead = {offset: 0}; // a proxy object we use to simulate the playhead position, but it can go infinitely in either direction and we'll just use an onUpdate to convert it to the corresponding time on the simpleloop timeline.
const wrapTime = gsap.utils.wrap(0, simpleloop.duration()); // feed in any offset (time) and it'll return the corresponding wrapped time (a safe value between 0 and the simpleloop's duration)
const scrub = gsap.to(playhead, { // we reuse this tween to smoothly scrub the playhead on the simpleloop
	offset: 0,
	onUpdate() {
		simpleloop.time(wrapTime(playhead.offset)); // convert the offset to a "safe" corresponding time on the simpleloop timeline
	},
	duration: 0.5,
	ease: "power3",
	paused: true
});
const trigger = ScrollTrigger.create({
	start: 0,
	onUpdate(self) {
		let scroll = self.scroll();
        scrub.vars.offset = (iteration + self.progress) * simpleloop.duration();
        scrub.invalidate().restart(); // to improve performance, we just invalidate and restart the same tween. No need for overwrites or creating a new tween on each update.
	},
	end: "+=3000",
	pin: ".projects_scrollable",
});

// when the user stops scrolling, snap to the closest item.
ScrollTrigger.addEventListener("scrollEnd", () => scrollToOffset(scrub.vars.offset));

// feed in an offset (like a time on the simpleloop timeline, but it can exceed 0 and duration() in either direction; it'll wrap) and it'll set the scroll position accordingly. That'll call the onUpdate() on the trigger if there's a change.
function scrollToOffset(offset) { // moves the scroll playhead to the place that corresponds to the totalTime value of the simpleloop, and wraps if necessary.
	let snappedTime = snapTime(offset),
		progress = (snappedTime - simpleloop.duration() * iteration) / simpleloop.duration(),
		scroll = progressToScroll(progress);
	trigger.scroll(scroll);
}   

function buildsimpleloop(items, spacing, animateFunc) {
	let overlap = Math.ceil(1 / spacing), // number of EXTRA animations on either side of the start/end to accommodate the seamless looping
		startTime = items.length * spacing + 0.5, // the time on the rawSequence at which we'll start the seamless loop
		loopTime = (items.length + overlap) * spacing + 1, // the spot at the end where we loop back to the startTime
		rawSequence = gsap.timeline({paused: true}), // this is where all the "real" animations live
		simpleloop = gsap.timeline({ // this merely scrubs the playhead of the rawSequence so that it appears to seamlessly loop
			paused: true,
		}),
		l = items.length + overlap * 2,
		time, i, index;

	// now loop through and create all the animations in a staggered fashion. Remember, we must create EXTRA animations at the end to accommodate the seamless looping.
	for (i = 0; i < l; i++) {
		index = i % items.length;
		time = i * spacing;
		rawSequence.add(animateFunc(items[index]), time);
		i <= items.length && simpleloop.add("label" + i, time); // we don't really need these, but if you wanted to jump to key spots using labels, here ya go.
	}

	// here's where we set up the scrubbing of the playhead to make it appear seamless.
	rawSequence.time(startTime);
	simpleloop.to(rawSequence, {
		time: loopTime,
		duration: loopTime - startTime,
		ease: "none"
	}).fromTo(rawSequence, {time: overlap * spacing + 1}, {
		time: startTime,
		duration: startTime - (overlap * spacing + 1),
		immediateRender: false,
		ease: "none"
	});
	return simpleloop;
}