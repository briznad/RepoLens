<script
	lang="ts"
	module
>
	import { listify } from 'briznads-helpers';
</script>


<script lang="ts">
	interface Props {
		count?: number;
		showAvatar?: boolean;
		avatarWidth?: string | string[];
		showFirstLine?: boolean;
		firstLineWidth?: string | string[];
		showSecondLine?: boolean;
		secondLineWidth?: string | string[];
	}

	let {
		count = 1,
		showAvatar = false,
		avatarWidth = '26px',
		showFirstLine = true,
		firstLineWidth = ['100%', '66.667%', '33.333%'],
		showSecondLine = false,
		secondLineWidth = '50%'
	}: Props = $props();

	let avatarWidthArr = $derived(listify(avatarWidth));
	let firstLineWidthArr = $derived(listify(firstLineWidth));
	let secondLineWidthArr = $derived(listify(secondLineWidth));
</script>


<style lang="scss">
	ion-skeleton-text {
		margin-top: 0;
		margin-bottom: 0;

		+ ion-skeleton-text {
			margin-top: 3px;
		}
	}
</style>


{#if showAvatar || showFirstLine || showSecondLine}
	{#each [...Array(count)] as _, index }
		<ion-item>
			{#if showAvatar}
				{@const thisAvatarWidth = avatarWidthArr[ index % avatarWidthArr.length ]}

				<ion-skeleton-text
					slot="start"
					animated={ true }
					style="width: { thisAvatarWidth || '100%' }; height: { thisAvatarWidth || '100%' };"
				></ion-skeleton-text>
			{/if}

			{#if showFirstLine || showSecondLine}
				<ion-label>
					{#if showFirstLine}
						{@const thisFirstLineWidth = firstLineWidthArr[ index % firstLineWidthArr.length ]}

						<ion-skeleton-text
							animated={ true }
							style="width: { thisFirstLineWidth || '100%' }; height: 14px;"
						></ion-skeleton-text>
					{/if}

					{#if showSecondLine}
						{@const thisSecondLineWidth = secondLineWidthArr[ index % secondLineWidthArr.length ]}

						<ion-skeleton-text
							animated={ true }
							style="width: { thisSecondLineWidth || '100%' }; height: 14px;"
						></ion-skeleton-text>
					{/if}
				</ion-label>
			{/if}
		</ion-item>
	{/each}
{/if}
