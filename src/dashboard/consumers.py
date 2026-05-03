from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from studio.services import update_studio_state
from studio.models import Studio
import json


@sync_to_async
def get_studio(slug):
    return Studio.objects.get(slug=slug)


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "dashboard"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def state_update(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def receive(self, text_data):
        data = json.loads(text_data)
        slug = data.get("slug")

        await self.channel_layer.group_send(
            slug, {"type": "device_command", "message": data}
        )

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))


class StudioConsumer(AsyncWebsocketConsumer):
    ALLOWED_COMMANDS = {"on_air", "record", "power"}

    async def connect(self):
        self.slug = self.scope["url_route"]["kwargs"]["slug"]
        self.studio = await get_studio(self.slug)
        self.group_name = self.slug

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.apply_update(data)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "device_command",
                "message": data,
                "sender_channel_name": self.channel_name,
            },
        )

        message = {"name": self.studio.name, **data}

        await self.channel_layer.group_send(
            "dashboard",
            {
                "type": "state_update",
                "message": message,
            },
        )

    async def apply_update(self, data):
        await sync_to_async(update_studio_state)(self.studio, data)

    async def device_command(self, event):
        if self.channel_name != event.get("sender_channel_name"):
            await self.send(text_data=json.dumps(event["message"]))
