<script setup>
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
</script>

<template>
  <header class="leading-normal lg:flex lg:items-center lg:pr-[calc(var(--section-gap)/2)]">
    <img
      alt="Vue logo"
      class="block mx-auto mb-8 lg:m-0 lg:mr-8"
      src="./assets/logo.svg"
      width="125"
      height="125"
    />

    <div class="lg:flex lg:items-start lg:flex-wrap">
      <HelloWorld msg="You did it!" />
    </div>
  </header>

  <main>
    <TheWelcome />
  </main>
</template>
